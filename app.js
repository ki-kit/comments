/*
1. Storage Keys and State ManagementTo keep track of registered users and the current active session without a database, we define specific storage keys and state variables:   
USERS_KEY ("simpleComments.users"): Stores the array of registered user objects ({ username, password }) in localStorage.   
SESSION_KEY ("simpleComments.session"): Tracks the currently logged-in username in sessionStorage so it persists during the browser session.   
authMode: Tracks whether the auth panel is currently set to "login" or "register" (defaults to "login").   
*/
const USERS_KEY = "simpleComments.users";
const SESSION_KEY = "simpleComments.session";

let authMode = "login";
let currentUser = sessionStorage.getItem(SESSION_KEY) || null;

// 2. Switching Between Login and Register Modes
// Users can switch between logging in and registering via interactive tabs defined in `index.html`[cite: 4]. Clicking these tabs updates the `authMode` state, adjusts button text, configures password autocomplete attributes, and clears old messages[cite: 1]:

function setAuthMode(mode) {
  authMode = mode;
  const isLogin = mode === "login";
  loginTab.classList.toggle("active", isLogin);
  registerTab.classList.toggle("active", !isLogin);
  loginTab.setAttribute("aria-selected", String(isLogin));
  registerTab.setAttribute("aria-selected", String(!isLogin));
  authSubmit.textContent = isLogin ? "Log in" : "Register";
  passwordInput.autocomplete = isLogin ? "current-password" : "new-password";
  authMessage.textContent = "";
}

/*
3. Handling Form Submission (Registration & Login)
When the authentication form is submitted, `app.js` performs validation checks, interacts with `localStorage` to check existing accounts, and updates the active session[cite: 1]:

* **Validation**: Ensures usernames are at least 3 characters and passwords are at least 4 characters long[cite: 1].
* **Registration Logic**: If `authMode === "register"`, it checks if the username already exists[cite: 1]. If unique, it pushes the new user object to the users array, saves it via `localStorage`, and instantly logs the user in by setting `sessionStorage`[cite: 1].
* **Login Logic**: If `authMode === "login"`, it verifies that the username exists and the password matches[cite: 1]. Upon success, it updates `currentUser` and stores it in `sessionStorage`[cite: 1].
*/

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (username.length < 3) {
    authMessage.textContent = "Username must be at least 3 characters.";
    return;
  }
  if (password.length < 4) {
    authMessage.textContent = "Password must be at least 4 characters.";
    return;
  }

  const users = getUsers();
  const existing = users.find(user => user.username.toLowerCase() === username.toLowerCase());

  if (authMode === "register") {
    if (existing) {
      authMessage.textContent = "That username is already registered.";
      return;
    }
    users.push({ username, password });
    saveJSON(USERS_KEY, users);
    currentUser = username;
    sessionStorage.setItem(SESSION_KEY, currentUser);
    authForm.reset();
    authMessage.textContent = "";
    render();
    return;
  }

  if (!existing || existing.password !== password) {
    authMessage.textContent = "Incorrect username or password.";
    return;
  }
  currentUser = existing.username;
  sessionStorage.setItem(SESSION_KEY, currentUser);
  authForm.reset();
  authMessage.textContent = "";
  render();
});


// 4. Logout Functionality
// To end the session, the `logout` function clears the active user from memory, removes the item from `sessionStorage`, resets any open reply states, and re-renders the UI to show the guest view[cite: 1]:
function logout() {
  currentUser = null;
  sessionStorage.removeItem(SESSION_KEY);
  openReplyId = null;
  render();
}