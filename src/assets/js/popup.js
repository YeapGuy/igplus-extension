//   - This file is part of IGPlus Extension
//  <https://github.com/ptjaworski/IGPlus-extension/blob/main/README.md>,
//   - Copyright (C) 2023-present IGPlus Extension
//   -
//   - IGPlus Extension is a software: you can redistribute and modify (for contribution purposes) under the terms of the Creative Commons 
//   - Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0) License.
//
//   - IGPlus Extension is distributed in the hope that it will be useful,
//   - but WITHOUT ANY WARRANTY; without even the implied warranty of
//   - MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//   - Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0) License for more details.
//   -
//   - You should have received a copy of the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0) License
//   - along with IGPlus Extension.  If not, see <https://creativecommons.org/licenses/by-nc-nd/4.0/>.

(() => {
  "use strict";
  (() => {
    document.addEventListener("DOMContentLoaded", () => {
      const container = document.getElementById("l3_settings");
      const main_nav = document.getElementById("header_nav");
      const lang_set = document.getElementById("lang_set");

      // Session-level unlock state (resets when popup closes)
      let sessionUnlocked = false;

      // Generate a 32-character random alphanumeric password
      function generateLockPassword() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, (b) => chars[b % chars.length]).join("");
      }

      // Lock screen: submit handler
      const lockPasswordInput = document.getElementById("lock_password_input");
      const lockSubmitBtn = document.getElementById("lock_submit_btn");
      const lockError = document.getElementById("lock_error");

      lockSubmitBtn.addEventListener("click", () => {
        chrome.storage.local.get("formState", (result) => {
          if (lockPasswordInput.value === result.formState?.lockPassword) {
            sessionUnlocked = true;
            document.body.classList.remove("settings_locked");
            lockError.textContent = "";
            lockPasswordInput.value = "";
          } else {
            lockError.textContent = "Incorrect password. Try again.";
          }
        });
      });

      lockPasswordInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") lockSubmitBtn.click();
      });

      // Password display: copy and close handlers
      const lockPwCopyBtn = document.getElementById("lock_pw_copy");
      const lockPwCloseBtn = document.getElementById("lock_pw_close");
      const lockPwValue = document.getElementById("lock_pw_value");

      lockPwCopyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(lockPwValue.textContent).then(() => {
          lockPwCopyBtn.textContent = "Copied!";
          setTimeout(() => {
            lockPwCopyBtn.setAttribute("data-i18n", "lock_pw_copy");
            lockPwCopyBtn.textContent = "Copy";
          }, 2000);
        });
      });

      lockPwCloseBtn.addEventListener("click", () => {
        document.body.classList.remove("show_lock_password");
      });


      // Disable stories logic
      function disableStories(state) {
        const mp_item = container.querySelector('input[name="mp_disable_stories"]');
        if (state?.ev_disable_stories) {
          mp_item.setAttribute("disabled", true);
          chrome.storage.local.set({ formState: { ...state, ev_disable_stories: true, mp_disable_stories: true } });
        } else mp_item.disabled = false;
      }

      // Nav to direct logic
      function navToDirect(state) {
        const mp_item = container.querySelector('input[name="mp_disable_recs"]');
        if (state?.nav_to_messages_first) {
          mp_item.setAttribute("disabled", true);
          chrome.storage.local.set({ formState: { ...state, nav_to_messages_first: true, mp_disable_recs: true } });
        } else mp_item.disabled = false;
      }

      // Listen for changes in chrome.storage.local
      let prevstate;
      chrome.storage.local.onChanged.addListener((changes, namespace) => {
        if (
          changes.formState &&
          changes.formState.newValue &&
          JSON.stringify({ ...changes.formState.newValue }) !== prevstate
        ) {
          prevstate = JSON.stringify({ ...changes.formState.newValue });
          initializeUpdate();
        }
      });

      // Defining a custom event object
      const formStateChangeEvent = new CustomEvent("formStateChange");


      // Function to dispatch the custom event
      function dispatchFormStateChangeEvent() {
        window.dispatchEvent(formStateChangeEvent);
      }

      function initializeUpdate() {
        console.log("rerender popup");
        // Retrieve state from extension storage or use the initial state
        chrome.storage.local.get("formState", (result) => {
          let state = result.formState ? result.formState : {};
          disableStories(state);
          navToDirect(state);

          if (!result.formState) {
            chrome.storage.local.set({ formState: state }, () => {
              dispatchFormStateChangeEvent();
            });
          }

          // Function to update the state object and form inputs
          function updateState(event) {
            const input = event.target;
            const value = input.type === "checkbox" ? input.checked : input.value;
            state[input.name] = value;

            // Save the updated state to extension storage
            chrome.storage.local.set({ formState: state }, () => {
              dispatchFormStateChangeEvent();
            });
          }

          // Function to update form inputs based on the state object
          function updateFormInputs() {
            const inputs = document.querySelectorAll("input, select");
            for (let i = 0; i < inputs.length; i++) {
              const input = inputs[i];
              if (input.type === "checkbox") {
                input.checked = state[input.name] || false;
              } else {
                input.value = state[input.name] || "";
              }
            }
          }

          //Function to update lang state
          function updateLangState(e) {
            state["lang_set"] = e.target.value || "en";
            console.log(e.target.value);
            // Save the updated state to extension storage
            chrome.storage.local.set({ formState: state }, () => {
              dispatchFormStateChangeEvent();
            });
          }

          // Function to update menu classes based on the state object
          function updateMenu() {
            //dark mode
            if (state["dark_mode"]) document.documentElement.classList.add("dark_mode");
            else document.documentElement.classList.remove("dark_mode");
            //disable or enable plugin
            if (state["disabled"]) document.body.classList.add("disabled");
            else document.body.classList.remove("disabled");
            //lock settings
            if (state["lockEnabled"]) document.body.classList.add("lock_enabled");
            else document.body.classList.remove("lock_enabled");
            // show lock screen only if not unlocked for this session
            if (state["lockEnabled"] && !sessionUnlocked) document.body.classList.add("settings_locked");
            else document.body.classList.remove("settings_locked");
          }

          //Function to update menu state
          function updateMenuState(e) {
            let action = e.target.getAttribute("data-action");

            if (action === "lock_settings") {
              if (!state["lockEnabled"]) {
                // Enable lock: generate password, store it, show it to user
                const password = generateLockPassword();
                state["lockEnabled"] = true;
                state["lockPassword"] = password;
                sessionUnlocked = true;
                chrome.storage.local.set({ formState: state }, () => {
                  dispatchFormStateChangeEvent();
                  lockPwValue.textContent = password;
                  document.body.classList.add("show_lock_password");
                });
              } else if (sessionUnlocked) {
                // Disable lock (only allowed when already unlocked for this session)
                state["lockEnabled"] = false;
                state["lockPassword"] = "";
                sessionUnlocked = false;
                chrome.storage.local.set({ formState: state }, () => {
                  dispatchFormStateChangeEvent();
                });
              }
              return;
            }

            if (action) {
              state[action] = !state[action];
            }
            // Save the updated state to extension storage
            chrome.storage.local.set({ formState: state }, () => {
              dispatchFormStateChangeEvent();
            });
          }

          // Add event listener to each input and update the state
          const inputs = container.querySelectorAll("input, select");
          inputs.forEach((input) => {
            if (input.type === "checkbox") {
              input.addEventListener("change", updateState);
            } else input.addEventListener("input", updateState);
          });

          //Add event listener to header nav & lang change
          main_nav.addEventListener("click", updateMenuState);
          lang_set.addEventListener("change", updateLangState);
          // Initialize the form inputs based on the state
          updateFormInputs();
          updateMenu();
        });
      }

      initializeUpdate();
    });
  })();
})();

