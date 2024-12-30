// content.js
// Author:
// Author URI: https://
// Author Github URI: https://www.github.com/
// Project Repository URI: https://github.com/
// Description: Handles all the webpage level activities (e.g. manipulating page data, etc.)
// License: MIT

const AiImgUrl = chrome.runtime.getURL("assets/ai-icon.jpg");

let userImg = "";
let chatBotImg = "";
let sendButtonImg = "";
let chatInitialized = 0;
let hidden = 0;

const AZ_PROBLEM_KEY = "AZ-AI";
const API_KEY = "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"

let prevUrl = "";

// Initialize chat context and question history

let context = [];
let getCurrentQuestions = [];

window.onbeforeunload = function() {
    // Check if the injected element exists
    const injectedElement = document.getElementById('ai-chat-box-generated-by-me');
    if (injectedElement) {
        // Remove the injected element from the DOM
        injectedElement.remove();
        context = [];
        getCurrentQuestions = [];
    }
};

const observer = new MutationObserver(() => {
    if(prevUrl === ""){
        prevUrl = window.location.href;
    } else if(prevUrl !== window.location.href){
        removeChatBox();
    }

    let switchElement = document.getElementsByClassName("ant-switch")[0];
    if (switchElement) {
        switchElement.addEventListener("click", changeTheme);
    }    
    addAiButton();
});

observer.observe(document.body, { childList: true, subtree: true });

// Helper to check if we're on the problems page
function onProblemsPage() {
    return window.location.pathname.includes('/problems/');
}

// Extracts the problem ID from the URL
function getIdOfProblem() {
    return extractProblemId(window.location.href);
}


let buttonEnabled = true;
// Adds the AI button to the UI

function changeTheme(){
    setTimeout(() => {
        const value = localStorage.getItem("playlist-page-theme");
        const x = value.substring(1).slice(0,-1);
        if(x === "light"){
        document.getElementById("add-ai-button").style.backgroundColor = "#172b4d";
        document.getElementById("add-ai-button").style.color = "hsla(0,0%,100%,.9)";
        } else {
        document.getElementById("add-ai-button").style.backgroundColor = "white";
        document.getElementById("add-ai-button").style.color = "black";
        }
    }, 200);

}



function addAiButton() {
    // console.log(document.getElementById("ai-chat-box-generated-by-me"));
    if (!onProblemsPage() || document.getElementById("add-ai-button")) return;
    
    
    const AiElement = document.createElement('button');
    AiElement.id = "add-ai-button";
    AiElement.textContent = 'Vivek.ai';
    AiElement.style.fontWeight = '600';
    AiElement.style.fontSize = '20px';
    AiElement.style.fontFamily = 'Open Sans';
    AiElement.style.padding = '5px';
    

    const askDoubtButton = document.querySelector(".coding_desc_container__gdB9M");
    if (askDoubtButton) {
        askDoubtButton.appendChild(AiElement);
        changeTheme();
        AiElement.addEventListener("click", addBookmarkHandler);
    } else {
        console.error('Unable to find the "ask doubt" button container.');
    }
}

// if intialization has not been done, then we can initialize it first, then work on toggling visiblity .

// Handles adding a bookmark and initializing the chat
async function addBookmarkHandler() {
    try {
        prevUrl = window.location.href;
        if(chatInitialized){
          if(hidden){
            showChatBox();
            hidden = 0;
          }
        } else {
            if(getCurrentQuestions.length === 0){
                getCurrentQuestions = await getQuestions();
            }
            const idOfProblem = getIdOfProblem();
            
            if (getCurrentQuestions.some((question) => question.id === idOfProblem)) {
                // Chat history exists
                for (let i = 0; i < getCurrentQuestions.length; i++) {
                    if (getCurrentQuestions[i].id === idOfProblem) {
                        context = getCurrentQuestions[i].context;
                        break;
                    }
                }
                injectChatBox();
            } else {
                // Fresh start
                updateContext("system", starterTemplate());
                injectChatBox();
                setTimeout( async () => {
                 await makeApiRequest();
                }, 500);
            }    
        }
   
    } catch (error) {
        console.error('Error in bookmark handler:', error);
    }
}

// Handles sending the user message
async function sendMessage() {
    let message = document.getElementById("user-input").value.trim();
    if (message) {
        updateContext("user", message);
        updateChatBox("user", message);
        document.getElementById("user-input").value = "";
        document.getElementById("user-input").style.height = "auto";
        await makeApiRequest();
    }
}

// Updates the chat box with messages
function updateChatBox(role, message) {
    if (!document.getElementById("add-ai-button")) {
        return;
    }

    let element2 = document.getElementById("chat-messages");
    let messageDiv = document.createElement('div');
    let paraElement = document.createElement('p');
    let imgElement = document.createElement('img');
    if(role === "assistant"){
       imgElement.src = chatBotImg;
       imgElement.style.height = '25px';
       imgElement.style.width = '25px';
       messageDiv.style.display = 'flex';
       messageDiv.style.flexDirection = 'row';
       paraElement.style.marginLeft = '10px';
       paraElement.innerHTML = message.substring(7).slice(0, -3);
    //    paraElement.innerHTML = message;
       messageDiv.appendChild(imgElement);
       messageDiv.appendChild(paraElement);
    } else {
       imgElement.src = userImg;
       imgElement.style.height = '25px';
       imgElement.style.width = '25px';
       paraElement.innerHTML = message;
       messageDiv.style.display = 'flex';
       messageDiv.style.flexDirection = 'row-reverse';
       paraElement.style.backgroundColor = '#eded68';
       paraElement.style.padding = '5px';
       paraElement.style.borderColor = 'transparent';
       paraElement.style.borderRadius = '7px';
       paraElement.style.marginRight = '10px';
       messageDiv.append(imgElement);
       messageDiv.append(paraElement);
    }
    // messageDiv.innerHTML = `<p>${role === "assistant" ? "Assistant" : "User"}: ${message}</p>`;
    if(role === "assistant"){
     messageDiv.style.textAlign = 'left';
    } else {
     messageDiv.style.textAlign = 'right';
    }
    element2.appendChild(messageDiv);
}

function showLoader(){
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const loaderContainer = document.getElementById('loader-container');
    const minimizeBtn = document.getElementById("minimize-chatbox-btn");
    if(userInput && sendButton && loaderContainer && minimizeBtn){
        console.log('entered here');
        loaderContainer.style.display = 'flex';  
        userInput.disabled = true;     
        sendButton.disabled = true; 
        minimizeBtn.disabled = true;
    }
}

function hideLoader(){
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const loaderContainer = document.getElementById('loader-container');
    const minimizeBtn = document.getElementById("minimize-chatbox-btn");
    if(userInput && sendButton && loaderContainer && minimizeBtn){
        loaderContainer.style.display = 'none';  
        userInput.disabled = false;           
        sendButton.disabled = false;
        minimizeBtn.disabled = false;
    }
}

// Makes the API request to OpenAI
async function makeApiRequest() {
    showLoader();
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "deepseek/deepseek-chat",
                messages: context,
            }),
        });
        console.log('response',response);
        if (!response.ok) {
            throw new Error(`Error: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();
        let answer = data.choices[0].message.content;
        updateContext("assistant", answer);
        updateChatBox("assistant", answer);
        hideLoader();
    } catch (error) {
        console.error('Error in OpenAI request:', error);
    }
}

// Sets or updates the context in storage
function setContext() {
    const idOfProblem = getIdOfProblem();
    const existingQuestionIndex = getCurrentQuestions.findIndex(q => q.id === idOfProblem);

    if (existingQuestionIndex !== -1) {
        // Update existing question context
        getCurrentQuestions[existingQuestionIndex].context = context;
    } else {
        const problemName = document.querySelector(".Header_resource_heading__cpRp1").innerText;
        getCurrentQuestions.push({ id: idOfProblem, problemName, context });
    }
     
    chrome.storage.local.set({ [AZ_PROBLEM_KEY]: getCurrentQuestions }, () => {
        console.log("Updated the context", getCurrentQuestions);
    });
}

// Updates the context and saves it
function updateContext(role, message) {
    context.push({ "role": role, "content": message });
    setContext();
}

// Removes the chat box from the UI
function removeChatBox() {
    const chatBox = document.getElementById("ai-chat-box-generated-by-me");
    if(chatBox){
        chatBox.remove();
        context = [];
        getCurrentQuestions = [];    
        chatInitialized = 0;
        hidden = 0;
        userImg = "";
        chatBotImg = "";
        sendButtonImg = "";
    }
}

console.log('context',context);

// Injects the chat box into the UI
function injectChatBox() {
    console.log('called injectChatBox');
    fetch(chrome.runtime.getURL("chatbox.html"))
        .then(response => response.text())
        .then(data => {
            let element = document.createElement('div');
            element.id = "ai-chat-box-generated-by-me";
            element.innerHTML = data;

            const aiButton = document.getElementById("add-ai-button");
            if (aiButton) {
                
                aiButton.insertAdjacentElement("afterend", element);
                
                userImg = chrome.runtime.getURL("assets/user.png");
                chatBotImg = chrome.runtime.getURL("assets/chatbot.png");
                sendButtonImg = chrome.runtime.getURL("assets/send-message.png");

                const element2 = document.getElementById("chat-messages");
                
                context.forEach(msg => {
                    if (msg.role !== "system") {
                        let messageDiv = document.createElement('div');
                        let imageElement = document.createElement('img');
                        let paraElement = document.createElement('p');
                        
                        if(msg.role === "assistant"){
                            imageElement.src = chatBotImg;
                            paraElement.innerHTML = msg.content.substr(7).slice(0, -3);
                            // paraElement.innerHTML = msg.content;
                            paraElement.style.marginLeft = '10px';
                            messageDiv.style.display = 'flex';
                            messageDiv.style.flexDirection = 'row';
                            messageDiv.style.textAlign = 'left';
                            imageElement.style.height = '25px';
                            imageElement.style.width = '25px';
                            messageDiv.appendChild(imageElement);
                            messageDiv.appendChild(paraElement);
                        } else {
                            imageElement.src = userImg;
                            paraElement.innerHTML = msg.content;
                            messageDiv.style.display = 'flex';
                            messageDiv.style.flexDirection = 'row-reverse';
                            messageDiv.style.textAlign = 'right';
                            imageElement.style.height = '25px';
                            imageElement.style.width = '25px';
                            paraElement.style.marginRight = '10px';
                            paraElement.style.padding = '5px';
                            paraElement.style.backgroundColor = '#eded68';
                            paraElement.style.borderRadius = '7px';
                            paraElement.style.borderColor = 'transparent';
                            messageDiv.appendChild(imageElement);
                            messageDiv.appendChild(paraElement);
                        }

                        // messageDiv.innerHTML = `<p>${msg.role === "assistant" ? "Assistant" : "User"}: ${msg.content}</p>`;
                        // if(msg.role === "assistant"){
                        //     messageDiv.style.textAlign = 'left';
                        // } else {
                        //     messageDiv.style.textAlign = 'right';
                        // }
                        // element2.appendChild(messageDiv);
                        element2.appendChild(messageDiv);
                    }
                });
                
                document.getElementById("send-button").addEventListener("click", sendMessage);
                document.getElementById("user-input").addEventListener('input', function() {
                    this.style.height = 'auto';  // Reset height to auto to recalculate
                    this.style.height = `${this.scrollHeight}px`;  // Set the height to the scroll height
                });
                document.getElementById("send-button-img").src = sendButtonImg;
                document.getElementById("minimize-chatbox-btn").addEventListener("click", hideChatBox)
                // Load the CSS
                let link = document.createElement("link");
                link.href = chrome.runtime.getURL("chatbox.css");
                link.rel = "stylesheet";
                document.head.appendChild(link);

                chatInitialized = 1;
                hidden = 0;

                console.log(chatInitialized, hidden);
            } else {
                console.error('Failed to inject chat box: AI button not found.');
            }
        })
        .catch(error => console.error('Error loading chatbox:', error));
}

// Extracts problem ID from the URL
function extractProblemId(url) {
    const start = url.indexOf("problems/") + "problems/".length;
    const end = url.indexOf("?", start);
    return end === -1 ? url.substring(start) : url.substring(start, end);
}

// Fetches questions from storage
function getQuestions() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([AZ_PROBLEM_KEY], results => {
            if (chrome.runtime.lastError) {
                // If there's an error during the get operation, reject the promise
                reject(chrome.runtime.lastError);
            } else {
                // If no error, resolve with the results (or an empty array if not found)
                resolve(results[AZ_PROBLEM_KEY] || []);
            }
        });
    });
}


function hideChatBox(){
    if(hidden === 0){
        document.getElementById("custom-chatbox").style.display = 'none';
        hidden = 1;
    }
}

function showChatBox(){
    if(hidden){
        document.getElementById("custom-chatbox").style.display = 'flex';
        hidden = 0;
    }
}


function starterTemplate(){
   
    let problemJson = parseProblemStatement();
    let problem = "";
    problem += "Problem Description:" + problemJson.problemDescription + "\n";
    problem += "Input Format:" + problemJson.problemInputFormat + "\n";
    problem += "Output Format:" + problemJson.problemOutputFormat + "\n";
    problem += "Problem Constraints:" + problemJson.problemConstraints + "\n";
    problem += "Problem Sample Input And Outputs:" + "\n";
    for(let i = 0; i < problemJson.problemSampleTestCases.length; i++){
        problem += problemJson.problemSampleTestCases[i] + "\n";
    }
    
    
    let WhispererForSystem = `Your Name is Codebuddy. Your Role as CodeBuddy is to assist users in solving coding problems by providing a well-structured, thorough explanation and solution for each coding question.
    
    Every solution you provide will be presented in HTML format with inline CSS for proper formatting. Each coding question will follow these components:
    
    1. **Problem Description**: A clear description of the coding problem.
    2. **Input Format**: Explain how the input will be given.
    3. **Output Format**: Specify the expected output.
    4. **Constraints**: Detail the limits of the input values.
    5. **Time Limit**: Typically around 1 second (up to 10^8 instructions).
    6. **Sample Inputs and Outputs**: Examples to verify the solution.
    
    When providing the solution, always follow these steps:
    1. **Decompose the Problem**: Break it into smaller, manageable parts, explain in which direction the user must think to solve this problem correctly or ideas he must be knowing to solve this problem.
    2. **Solution Approach**: Describe the logic and reasoning behind the solution, ensuring correctness and efficiency while addressing edge cases.
    3. **C++ Implementation**: Write the solution using C++.
    4. **Time Complexity Analysis**: Analyze and state the time complexity.
    5. **Validation**: Test against sample inputs and outputs, refining as needed.
    6. **Test Cases**: Provide test cases demonstrating correctness.
    
    Every time you respond with a solution, use  html, inline css to display the answer , 

    Below is an example template for the C++ code solution you will follow:

    <pre style="background-color:black; padding:10px;">
      #include&lt;bits/stdc++.h&gt;
      using namespace std;
      #define endl '\n'
    
      using ll = long long int;
      ll const pi = acos(-1);
      ll const mod = 1e9 + 7;
    
      void precompute(){
        // Logic for precomputation goes here
      }
    
      void solve(){
        // The solution to the problem goes here
      }
    
      void fast_io(){
        ios_base::sync_with_stdio(0);
        cin.tie(0);
        cout.tie(0);
      }
    
      signed main(){
        fast_io();
        precompute(); // Use if necessary
        ll testCases = 1;
        // Input for multiple test cases if required
        cin >> testCases;
        while(testCases--){
          solve();
        }
      }
    </pre>
    
    ### Key Features of CodeBuddy:
    1. **Personalized Learning**: Adapt solutions to the user's skill level.
    2. **Interactive Problem Solving**: Engage with the user to clarify doubts.
    3. **Error Diagnosis and Correction**: Help identify issues and improve the code.
    4. **Encouraging Environment**: Always use a positive tone and motivate the user.
    
    When providing explanations for mathematical or coding concepts, present the solution in an easy-to-understand format with explanations and examples in HTML. Format the explanations using inline CSS to ensure clarity.
    
    For example:
    - Use bullet points for step-by-step guides.
    - Present code in code blocks using HTML's {<pre>} and {<code>} tags.
    - Use headings and styling to make sections like "Solution Approach" and "Time Complexity" clear.
    
    If the user provides feedback, follow these steps:
    1. **Acknowledge**: Confirm you understood the feedback.
    2. **Identify Errors**: Highlight any mistakes in the initial solution.
    3. **Refinement**: Improve the solution based on the feedback.
    
    Coding Question : <${problem}>

    Solution : <>
    
    `;
       
    return  WhispererForSystem;
}

function parseProblemStatement(){
    const list = document.getElementsByClassName("problem_paragraph");

    let obj = {
        timeLimit : list[2].innerHTML,
        memoryLimit : list[4].innerHTML,
        problemDescription : null,
        problemInputFormat : null,
        problemOutputFormat : null,
        problemConstraints : null,
        problemSampleTestCases : []
    }
    
    const list2 = document.getElementsByClassName("coding_desc__pltWY problem_paragraph")[0];
    obj = {...obj, problemDescription : list2.innerText};

    const list3 = document.getElementsByClassName("coding_input_format__pv9fS problem_paragraph");
    for(let  i = 0; i < list3.length; i++){
        if(i == 0){
            obj = {...obj, problemInputFormat : list3[i].innerText};
        } else if(i == 1){
            obj = {...obj, problemOutputFormat: list3[i].innerText};
        } else if(i == 2){
            obj = {...obj, problemConstraints: list3[i].innerText};
        }
    }


    let elements = document.querySelectorAll('.mt-4');

    let filteredElements = Array.from(elements).filter(element => {
        return element.classList.length === 1 && element.classList.contains('mt-4');
    });
    
    for(let  i = 0; i < filteredElements.length; i++){
        obj.problemSampleTestCases.push(filteredElements[i].children[0].innerText)
    }

    return obj;
}



/**
 * 
 *            const newParagraph = document.createElement("p");
              newParagraph.textContent = 'Hello'; // Set the text content of the paragraph
              newParagraph.style.height = '90px'; newParagraph.style.color = 'white'; newParagraph.style.width = '90px'; newParagraph.style.background = 'red';
              // Get the target element where you want to insert the new paragraph
              const targetElement = document.getElementsByClassName("coding_leftside_scroll__CMpky")[0];

              // Append the new paragraph as the last child of the target element
              targetElement.appendChild(newParagraph);


              we can add below the input format.
              an expandable chat box ,
              which on expanding expands,
              then contracts become the normal state,
              here there will be a text box for user to send messages to ai agent.

              we will store for each question its context, the conversation in sync storage, and populate on frontend, 
              when sending request, we append the message back on the conversation to ai agent, receive response , update the 

              if the conversation is empty, fill it with only the system meessage that we send.


              

 * 
 */


                  // if(document.getElementById("ai-chat-box-generated-by-me")){
    //     document.getElementById("ai-chat-box-generated-by-me").style.display = 'block';
    //     return;
    // }



        // on clicking the ai button, you can toggle the visiblity of chatbox.
    // if it is first time you are opening then chatbox will be empty, we need to load previous history on the chatbox, if it exists.
    // it it is not the first time you have toggled your visiblity, then the chatbox content will be the same itself.


    // whenever the ai response is there, update , the chat stored in the context array, and in the sync storage.



    // const getCurrentBookmarks = await getBookmarks();
    // const url = window.location.href;
    // const id = extractProblemId(url);
    // const problemName = document.getElementsByClassName("Header_resource_heading__cpRp1 rubik fw-bold mb-0 fs-4")[0].innerText;
    
    // if(getCurrentBookmarks.some((bookmark) => bookmark.id === id)) return;

    // const bookmarkObj = {
    //     id : id,
    //     problemName : problemName,
    //     url : url
    // }

    // const updatedBookmarks = [...getCurrentBookmarks, bookmarkObj];

    // chrome.storage.sync.set({AZ_PROBLEM_KEY : updatedBookmarks}, () => {
    //     console.log("updated the bookmarks", updatedBookmarks);
    // })


    