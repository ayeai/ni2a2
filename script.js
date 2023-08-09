document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const applyApiKeyButton = document.getElementById('apply-api-key');
  const conversationElement = document.getElementById('conversation');
  const userMessageInput = document.getElementById('user-message');
  const sendButton = document.getElementById('send-button');
  const startRecordingButton = document.getElementById('record-button');
  const stopRecordingButton = document.getElementById('stop-button');
  const playRecordingButton = document.getElementById('play-button');
  const pauseRecordingButton = document.getElementById('pause-button');
  const downloadButton = document.getElementById('download-button');
  const copyConversationButton = document.getElementById('copy-conversation-button');
  const readResponseButton = document.getElementById('read-response-button');
  const startSpeechRecognitionButton = document.getElementById('start-speech-recognition-button');
  const newConversationButton = document.getElementById('new-conversation-button');
  const currentConversationButton = document.getElementById('current-conversation-button');
  const takePhotoButton = document.getElementById('take-photo-button');
  

let apiKey = '';
let conversation = [];
let mediaRecorder;
let recordedChunks = [];
let conversationCounter = 1;

applyApiKeyButton.addEventListener('click', () => {
    apiKey = apiKeyInput.value;
    console.log('API Key set:', apiKey);
});

sendButton.addEventListener('click', () => sendMessage(userMessageInput.value));
copyConversationButton.addEventListener('click', copyConversation);
readResponseButton.addEventListener('click', readResponse);

startRecordingButton.addEventListener('click', startRecording);
stopRecordingButton.addEventListener('click', stopRecording);
playRecordingButton.addEventListener('click', playRecording);
pauseRecordingButton.addEventListener('click', pauseRecording);
downloadButton.addEventListener('click', downloadRecording);

startSpeechRecognitionButton.addEventListener('click', startSpeechRecognition);
newConversationButton.addEventListener('click', startNewConversation);
currentConversationButton.addEventListener('click', switchToCurrentConversation);
takePhotoButton.addEventListener('click', takePhoto);

function displayMessage(message, role) {
    const messageElement = document.createElement('div');
    const roleClass = role === 'user' ? 'user-message' : 'ai-message';
    messageElement.classList.add(roleClass);
    messageElement.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)}: ${message}`;
    conversationElement.appendChild(messageElement);
    conversationElement.scrollTop = conversationElement.scrollHeight;
}

async function sendMessage(message) {
    if (!apiKey) {
        console.error('API Key not set');
        return;
    }

    if (message.trim() === '') return;

    displayMessage(message, 'user');
    userMessageInput.value = '';

    conversation.push({ role: 'user', content: message });
    await getAIResponse();

    const lastAssistantMessage = conversation[conversation.length - 1];
    displayMessage(lastAssistantMessage.content, 'ai');
}

async function getAIResponse() {
    const apiUrl = 'https://api.openai.com/v1/chat/completions';
    const requestData = {
        messages: conversation,
        model: 'gpt-3.5-turbo'
    };

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestData),
    });

    if (!response.ok) {
        console.error(`API request failed with status: ${response.status}`);
        return;
    }

    const responseData = await response.json();
    const assistantResponse = responseData.choices[0].message.content;

    conversation.push({ role: 'assistant', content: assistantResponse });
}

function copyConversation() {
    const conversationText = conversation.map(msg => {
        if (msg.role === 'user') {
            return 'User: ' + msg.content;
        } else {
            return 'AI assistant: ' + msg.content;
        }
    }).join('\n');

    const textarea = document.createElement('textarea');
    textarea.value = conversationText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    alert('Conversation copied to clipboard!');
}

function readResponse() {
    const lastAssistantMessage = conversation[conversation.length - 1];
    const responseText = lastAssistantMessage.content;
    speak(responseText);
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(utterance);
    } else {
        console.error('Speech synthesis is not supported in this browser.');
    }
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(function (stream) {
            const options = { mimeType: 'audio/ogg' };
            mediaRecorder = new MediaRecorder(stream, options);

            mediaRecorder.ondataavailable = function (event) {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            mediaRecorder.start();
        })
        .catch(function (error) {
            console.error('Error starting recording:', error);
        });
}

function stopRecording() {
    mediaRecorder.stop();
}

function playRecording() {
    const audio = new Audio();
    const blob = new Blob(recordedChunks, { type: 'audio/ogg' });
    const audioUrl = URL.createObjectURL(blob);
    audio.src = audioUrl;
    audio.play();
}

function pauseRecording() {
    mediaRecorder.pause();
}

function downloadRecording() {
    const blob = new Blob(recordedChunks, { type: 'audio/ogg' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recording.ogg';
    a.click();
}

function startSpeechRecognition() {
    if (!mediaRecorder || recordedChunks.length === 0) {
        console.error('No recorded audio available');
        return;
    }

    const audioBlob = new Blob(recordedChunks, { type: 'audio/ogg' });

    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.ogg');
    formData.append('model', 'whisper-1');

    fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        body: formData,
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log('OpenAI API Response:', data);
        
        if (data.text) {
            const transcription = data.text;
            displayMessage('Transcription: ' + transcription, 'user');
            sendMessage(transcription);
        } else {
            console.error('Speech recognition response does not contain transcription');
        }
    })
    .catch(error => {
        console.error('Error sending audio to OpenAI API:', error);
    });
}

function startNewConversation() {
  conversationCounter++;
  switchToCurrentConversation();
  conversation = [];
  conversationElement.innerHTML = '';
  sendMessage("Hello, ChatGPT! This is conversation #" + conversationCounter);
}

function switchToCurrentConversation() {
  newConversationButton.classList.remove('active');
  currentConversationButton.classList.add('active');
}

function takePhoto() {
  alert("Taking a photo...");
}

  // Rest of your script code...
});

