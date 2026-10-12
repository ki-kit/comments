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

/*
5. Restricting Comments to Logged-In UsersTo ensure that only authenticated users can add comments while guests can only view the discussion, the UI dynamically renders or hides the comment composer based on the currentUser state.   
Conditional Rendering in render(): When a user logs in, render() appends a top-level comment composer (the "Add Comment" box) and hides the guest notice. If no user is logged in, the composer is removed, and a guest notice is displayed.   
Submission Safeguard: Inside createComposer(), submission handlers explicitly verify authentication before processing any text.
*/
function createComposer(parentId = null) { 
  const form = makeElement("form", parentId === null ? "new-comment" : "reply-form");
  // configuration of textarea and buttons
  const formId = `comment-text-${++nextFormId}`;
  if (parentId === null) {
    form.append(makeElement("h3", "", "Add a comment"));
  }
  const label = makeElement("label", "", parentId === null ? "Your comment" : "Your reply");
  label.htmlFor = formId;
  const textarea = makeElement("textarea");
  textarea.id = formId;
  textarea.name = "comment";
  textarea.maxLength = 5000;
  textarea.required = true;
  textarea.placeholder = "Write your thoughts…";
  textarea.setAttribute("aria-label", parentId === null ? "Your comment" : "Your reply");
  form.append(label, textarea);

  const actions = makeElement("div", "form-actions");
  const submit = makeElement("button", "add-button", "Add Comment");
  submit.type = "submit";
  const cancel = makeElement("button", "cancel-button", "Cancel");
  cancel.type = "button";
  cancel.addEventListener("click", () => {
    if (parentId !== null) {
      openReplyId = null;
      render();
    } else {
      form.remove();
    }
  });
  actions.append(submit, cancel);
  form.append(actions);
  const message = makeElement("p", "blocked-message");
  message.setAttribute("aria-live", "polite");
  form.append(message);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!currentUser) {
      message.textContent = "Please log in before adding a comment.";
      return;
    }
    // validation and comment saving logic
    const text = textarea.value.trim();
    if (!text) {
      message.textContent = "Please enter a comment.";
      return;
    }

    submit.disabled = true;
    cancel.disabled = true;
    message.className = "muted";
    message.textContent = "Checking comment…";

    try {
      const result = await checkCommentInWorker(text);
      if (!result.allowed) {
        message.className = "blocked-message";
        message.textContent = `This comment cannot be posted because it contains a blocked word: ${result.word}.`;
        submit.disabled = false;
        cancel.disabled = false;
        return;
      }

      const comment = {
        id: (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
        author: currentUser,
        text,
        timestamp: new Date().toISOString(),
        replies: []
      };
      const comments = getComments();
      if (parentId === null) {
        comments.push(comment);
      } else if (!addReplyToTree(comments, parentId, comment)) {
        message.className = "blocked-message";
        message.textContent = "The comment you are replying to could not be found. Please refresh and try again.";
        submit.disabled = false;
        cancel.disabled = false;
        return;
      }
      saveJSON(COMMENTS_KEY, comments);
      openReplyId = null;
      render();
    } catch (error) {
      console.error(error);
      message.className = "blocked-message";
      message.textContent = "The comment checker could not start. Please run this page through a local web server and try again.";
      submit.disabled = false;
      cancel.disabled = false;
    }
  });
  return form;
}

/*
6. Building the Comment Tree Structure
To allow users to reply to any comment—creating a nested subtree of discussions—the application uses recursive data management and rendering functions[cite: 1, 5].

* **Recursive Subtree Attachment (`addReplyToTree`)**: When a reply is submitted with a `parentId`, this helper function recursively traverses the comment array and its nested `replies` arrays until it finds the target comment ID, appending the new reply to its children[cite: 1].
*/

function addReplyToTree(comments, targetId, reply) {
  for (const comment of comments) {
    if (comment.id === targetId) {
      comment.replies = comment.replies || [];
      comment.replies.push(reply);
      return true;
    }
    if (addReplyToTree(comment.replies || [], targetId, reply)) return true;
  }
  return false;
}



















/*
* **Recursive Node Rendering (`createCommentNode`)**: Each comment node renders its own details, action buttons (like the **Reply** button available to logged-in users), any active reply form, and a container for child replies which recursively calls `createCommentNode` for every nested reply
*/

function createCommentNode(comment) {
  const article = makeElement("article", "comment");
  // set up author, time, body
  article.dataset.commentId = comment.id;
  const top = makeElement("div", "comment-top");
  top.append(
    makeElement("span", "comment-author", comment.author),
    makeElement("time", "comment-time", formatTimestamp(comment.timestamp))
  );
  article.append(top, makeElement("p", "comment-body", comment.text));

  const actions = makeElement("div", "comment-actions");
  if (currentUser) {
    const replyButton = makeElement("button", "reply-button", "Reply");
    replyButton.type = "button";
    replyButton.addEventListener("click", () => {
      openReplyId = openReplyId === comment.id ? null : comment.id;
      render();
      if (openReplyId) {
        const input = document.querySelector(`[data-reply-to="${CSS.escape(comment.id)}"] textarea`);
        if (input) input.focus();
      }
    });
    actions.append(replyButton);
  }
  article.append(actions);

  if (currentUser && openReplyId === comment.id) {
    const replyForm = createComposer(comment.id);
    replyForm.dataset.replyTo = comment.id;
    article.append(replyForm);
  }

  const replies = makeElement("div", "comment-children");
  for (const reply of comment.replies || []) replies.append(createCommentNode(reply));
  article.append(replies);
  return article;
}