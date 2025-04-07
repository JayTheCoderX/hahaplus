const DOMPurify = window.DOMPurify;

let server_address = 'wss://hahachatserver.thered.sh';

let users = { "amount": 0, "users": [] }
let currentUsername = "Guest"; // Default username
const cssWhitelist = {
    color: {
        allowAll: true
    },
    "background-color": {
        allowAll: true
    },
    "border-radius": {
        allowAll: true
    },
    "padding-right": {
        allowAll: true
    },
    "padding-left": {
        allowAll: true
    },
    "margin-right": {
        allowAll: true
    },
    "margin-left": {
        allowAll: true
    },
    fontSize: {
        unit: 'px',
        min: 4,
        max: 48,
    },
    fontFamily: {
        allowedValues: ['Arial', 'Verdana', '"Times New Roman"', '"Courier New"'], // Quote font names with spaces
    },
    textAlign: {
        allowedValues: ['left', 'center', 'right', 'justify'],
    },
    margin: {
        unit: 'px',
        max: 50, // Max margin in pixels
    },
    padding: {
        unit: 'px',
        max: 30, // Max padding in pixels
    },
    borderStyle: {
        allowedValues: ['solid', 'dashed', 'dotted', 'none'],
    },
    "borderWidth": {
        unit: 'px',
        max: 10, // Max border width
    },
    height: {
        unit: 'em',
        max: 5
    },
    "vertical-align":
        { allowAll: true },
    borderColor: {
        allowedValues: ['black', 'gray', 'silver', /#[0-9a-fA-F]{6}/],
    },
    opacity: {
        min: 0,
        max: 1,
    },
    textDecoration: {
        allowedValues: ['underline', 'line-through', 'none'],
    },
    fontWeight: {
        allowedValues: ['bold', 'normal', 'lighter', 'bolder', '100', '200', '300', '400', '500', '600', '700', '800', '900'], // Allow numeric weights too
    },
    fontStyle: {
        allowedValues: ['italic', 'normal', 'oblique'],
    },
    // ... add more properties as needed
};

function sanitizeStyles(styles, whitelist) {
    const sanitizedStyles = {};
    for (const property in styles) {
        if (whitelist.hasOwnProperty(property)) {
            const rule = whitelist[property];
            const value = styles[property];
            if (rule.allowedValues || rule.allowAll) {
                let valueAllowed = false;
                if (rule.allowAll) { valueAllowed = true } else {
                    for (const allowedValue of rule.allowedValues) {
                        if (typeof allowedValue === 'string' && value.toLowerCase() === allowedValue.toLowerCase()) {
                            valueAllowed = true;
                            break;
                        } else if (allowedValue instanceof RegExp && allowedValue.test(value)) {
                            valueAllowed = true;
                            break;
                        }
                    }
                }
                if (valueAllowed) {
                    sanitizedStyles[property] = value;
                }
            } else if (rule.unit && (rule.min !== undefined || rule.max !== undefined)) {
                const unitRegex = new RegExp(`^(-?\\d+(\\.\\d+)?)${rule.unit}$`); // e.g., ^(-\d+(\.\d+)?)(px)$
                const match = value.match(unitRegex);
                if (match) {
                    const numericValue = parseFloat(match[1]);
                    if ((rule.min === undefined || numericValue >= rule.min) && (rule.max === undefined || numericValue <= rule.max)) {
                        sanitizedStyles[property] = value; // Keep the original value with unit
                    }
                }
            }
            // Add more value validation logic based on your whitelist rules
        }
    }
    return sanitizedStyles;
}

function stylesToString(sanitizedStyles) {
    let styleString = '';
    for (const property in sanitizedStyles) {
        styleString += `${property}: ${sanitizedStyles[property]}; `;
    }
    return styleString.trim(); // Remove trailing space
}

function processElement(element, whitelist) {
    const styleAttribute = element.getAttribute('style');
    if (styleAttribute) {
        const parsedStyles = parseInlineStyles(styleAttribute);
        const sanitizedStyles = sanitizeStyles(parsedStyles, whitelist);
        const newStyleString = stylesToString(sanitizedStyles);
        if (newStyleString) {
            element.setAttribute('style', newStyleString);
        } else {
            element.removeAttribute('style'); // Remove style attribute if no valid styles left
        }
    }
    // Recursively process child elements if needed, depending on how you're traversing your HTML
    for (const child of element.children) {
        processElement(child, whitelist);
    }
}

function parseInlineStyles(styleString) {
    const styles = {};
    if (!styleString) return styles;
    const declarations = styleString.split(';');
    for (const declaration of declarations) {
        const parts = declaration.split(':').map(part => part.trim());
        if (parts.length === 2) {
            const property = parts[0].trim();
            const value = parts[1].trim();
            if (property && value) {
                styles[property] = value;
            }
        }
    }
    return styles;
}

document.addEventListener('DOMContentLoaded', function () {
    let lastMessageUser = "<span style=\"color: #ff5c5c!important;\">SYSTEM</span>"
    document.getElementById('filebox').onchange = function (evt) {
        var tgt = evt.target || window.event.srcElement,
            files = tgt.files;

        // FileReader support
        if (FileReader && files && files.length) {
            var fr = new FileReader();
            fr.onload = function () {
                sendMessage("<img src='" + fr.result + "' style='max-width:25em; max-height:15em;'>")
            }
            fr.readAsDataURL(files[0]);
        }

        // Not supported
        else {
            // fallback -- perhaps submit the input to an iframe and temporarily store
            // them on the server until the user's session ends.
        }
    }

    let connection = new WebSocket(server_address);
    if (!currentUsername) { currentUsername = "" }
    connection.addEventListener('open', () => {
        if (usernameInput.value == " ") { usernameInput.value = "PlusClient_" + Math.floor(Math.random() * 9999); }
        if (usernameInput.value.trim() !== "") {
            currentUsername = "<span style=\"color: #1d9bf0\">" + usernameInput.value.trim() + "</span> <img src=\"https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg\" alt=\"Verified\" style=\"display: inline-block; vertical-align: middle; width: 1em; height: 1em;\">";
        } else {
            currentUsername = "<span style=\"color: #1d9bf0\">PlusClient</span> <img src=\"https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg\" alt=\"Verified\" style=\"display: inline-block; vertical-align: middle; width: 1em; height: 1em;\">"; // Revert to default if input is empty
        }
        usernameInput.value = usernameInput.value.trim(); // Update input field to show current username
        connection.send(JSON.stringify({ type: 'auth', data: "<span style=\"color: #1d9bf0\">" + usernameInput.value.trim() + "</span> <img src=\"https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg\" alt=\"Verified\" style=\"display: inline-block; vertical-align: middle; width: 1em; height: 1em;\">" }));
    });
    const messageList = document.getElementById('message-list');

    // Function to append a new message to the chat
    function appendMessage(username, messageText, special) {
        // Create a new message div
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        if (special) { messageDiv.classList.add('specialMessage'); }

        // Create a span for the username
        const usernameSpan = document.createElement('span');
        usernameSpan.classList.add('username');
        usernameSpan.innerHTML = DOMPurify.sanitize(username, { FORBID_ATTR: ['autoplay'] }) + ":"; // Add username and colon

        // Create a span for the message text
        const textSpan = document.createElement('span');
        textSpan.innerHTML = DOMPurify.sanitize(messageText, { FORBID_ATTR: ['autoplay'] })

        // Append username and text spans to the message div
        if (username != lastMessageUser) { y = messageDiv.appendChild(usernameSpan); }
        x = messageDiv.appendChild(textSpan);
        processElement(x, cssWhitelist)
        processElement(y, cssWhitelist)

        // Append the message div to the message list

        if (username != lastMessageUser) {
            const lineBreak = document.createElement("div");
            lineBreak.classList.add('msg-seperate')
            messageList.appendChild(lineBreak)
        }
        // Optionally, scroll to the bottom to show the latest message

        lastMessageUser = username
        src = document.createElement("pre")
        src.textContent = JSON.stringify({ "msg.data.username": username, "msg.data.msg": messageText }, null, "  ")
        src.classList.add("source")
        srcShow = document.createElement("button")
        srcShow.classList.add("showSource")
        srcShow.textContent = "<\\>"

        srcShow.addEventListener("click", function () {
            this.classList.toggle("active");
            var content = this.nextElementSibling;
            if (content.style.display === "block") {
                content.style.display = "none";
                content.style.maxHeight = "0px"
            } else {
                content.style.display = "block";
                content.style.maxHeight = "150px"
            }
        });
        messageDiv.appendChild(srcShow);
        messageDiv.appendChild(src)
        //sourceContainer = document.createElement("div")
        messageList.appendChild(messageDiv);
        messageList.scrollTop = messageList.scrollHeight;

    }

    // Example usage:
    // You can call appendMessage() with a username and message text to add a message.
    // For instance, to simulate receiving a message:
    //appendMessage("User1", "Hello, world!");
    appendMessage("PlusClient", "Welcome to PlusClient!", true)
    //appendMessage("User2", "Hey there!");
    //appendMessage("User1", "This is a longer message to demonstrate word wrapping. It should wrap within the message container.");


    // --- Example of how to integrate with the input and send button ---

    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    const usernameInput = document.getElementById('username'); // Assuming you have a username input


    // Get username from input when "Set" button is clicked (assuming you add this functionality)
    const setUsernameButton = document.getElementById('set');
    if (setUsernameButton) {
        connection.close()
        setUsernameButton.addEventListener('click', function () {
            const enteredUsername = usernameInput.value.trim();
            if (enteredUsername !== "") {
                currentUsername = "<span style=\"color: #1d9bf0\">"
                    + enteredUsername
                    + "</span> <img src=\"https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg\" alt=\"Verified\" style=\"display: inline-block; vertical-align: middle; width: 1em; height: 1em;\">";
            } else {
                currentUsername = "<span style=\"color: #1d9bf0\">PlusClient</span> <img src=\"https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg\" alt=\"Verified\" style=\"display: inline-block; vertical-align: middle; width: 1em; height: 1em;\">"; // Revert to default if input is empty
            }
            usernameInput.value = enteredUsername; // Update input field to show current username
            connection = new WebSocket('wss://hahachatserver.thered.sh');
            connection.addEventListener('open', () => {
                connection.send(JSON.stringify({ type: 'auth', data: currentUsername }));
            });

        });
    }

    connection.addEventListener('message', (event) => {
        let message = event.data;
        let msg = null;
        try {
            console.log(message);
            msg = JSON.parse(message);
        } catch (e) { }

        if (msg === null) {
            console.log('msg failed to parse');
            return;
        }

        if (msg.type === undefined) {
            console.log('msg type undefined');
            return;
        }

        // here we handle the message
        switch (msg.type) {
            case 'msg':
                appendMessage(msg.data.username, msg.data.msg);
                break
            case 'err':
                appendMessage("Info", msg.data, true);
                break
            case 'people':
                users = msg.data

                document.getElementById("userlist").innerHTML = ""
                let userList = document.getElementById("userlist")
                for (let i = 0; i < users['users'].length; i++) {
                    userDiv = document.createElement("div")
                    userDiv.classList.add("message")
                    userDiv.classList.add("messagepad")
                    const usernameSpan = document.createElement('span');
                    usernameSpan.classList.add('username');
                    usernameSpan.innerHTML = DOMPurify.sanitize(users['users'][i], { FORBID_ATTR: ['autoplay'] }); // Add username and colon
                    x = userDiv.appendChild(usernameSpan);

                    processElement(x, cssWhitelist)
                    userList.appendChild(userDiv);
                }
                document.getElementById("userstring").textContent = "Users (" + users['users'].length + " online):"
        }
    })
    function sendMessage(msg) {
        if (msg == "") return;
        connection.send(JSON.stringify({ type: 'msg', data: msg }));
    }
    sendButton.addEventListener('click', function () {
        const messageText = messageInput.value.trim(); // Get message and trim whitespace
        if (messageText !== "") {
            //appendMessage(currentUsername, messageText); // Append message with current username
            sendMessage(messageText)
            messageInput.value = ""; // Clear the input field after sending
        }
    });

    // Optional: Send message on Enter key press in the input field
    messageInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            sendButton.click(); // Trigger the send button click event
            event.preventDefault(); // Prevent default form submission (if inside a form)
        }
    });
});

document.getElementById("current-server").innerText = server_address.split("://")[1];

document.getElementById("current-server-sec-status").innerHTML =
    server_address.startsWith("wss")
        ? "<i class='fa-solid fa-lock'></i>"
        : "<i class='fa-solid fa-triangle-exclamation'></i>";