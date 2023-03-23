import { chatGPT } from './classes.js';
import { payloadMessage } from './classes.js';
import { payloadRole } from './classes.js';
import * as manageLS from './manageLocalStorage.js';
import * as utils from './utils.js';
import { openAIChatComplete, stopStream } from './openAI.js';
import * as exports from './export.js';
import { decrypt, encrypt } from './cryptography.js';

const chatGPTData = new chatGPT();

const systemRole = chatGPT.roles.system.role;
const userRole = chatGPT.roles.user.role;
const assistantRole = chatGPT.roles.assistant.role;

const getRole = (roleString: string) => {
  switch (roleString) {
    case systemRole:
      return chatGPT.roles.system;
    case userRole:
      return chatGPT.roles.user;
    case assistantRole:
      return chatGPT.roles.assistant;
    default:
      return new payloadRole('?', '❔', '?', 'Unknown role');
  }
};

const getIcon = (role: string) => {
  return getRole(role).icon;
};

// html elements
const chatGPTForm = document.querySelector('#chatgpt-form') as HTMLFormElement;
const switchRoleButtons = document.querySelectorAll('.role-switch') as NodeListOf<HTMLButtonElement>;
const deleteMessageButtons = document.querySelectorAll('.message-delete') as NodeListOf<HTMLButtonElement>;
const textAreas = document.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
const messagesContainer = document.querySelector('#messages-container') as HTMLDivElement;
const addMessageButton = document.querySelector('#add-message') as HTMLButtonElement;

// initialize elements
let apiKey = manageLS.getAPIKey();

if (!apiKey) {
  const key = window.prompt("ramz");
  try {
    if (key) {
      const enced = "U2FsdGVkX1/9lgY/dvhQbDC4jQW5jZo0XI6bBS9KzorJka0uOSjLYmn/LwuA3V9L6PERQZbvEoMwI1KPDCWY16AU1wgeOboU6RJRTk5D5DQ="
      const api = decrypt(enced, key);
      if (!api) {
        window.location.reload();
      } else {
        apiKey = api;
        manageLS.setAPIKey(api);
      }
    } else {
      window.location.reload();
    }
  } catch (e) {
    window.location.reload();
  }
}

textAreas.forEach(textAreaEventListeners);
textAreas.forEach(utils.resizeTextarea);
switchRoleButtons.forEach(switchRoleEventListeners);
deleteMessageButtons.forEach(messageDeleteButtonEventListener);

const textAreaDisplayProperties = textAreas[0].style.display;

textAreas.forEach(createPreviewDiv);

function createPreviewDiv(textArea: HTMLTextAreaElement) {
  const previewDiv = document.createElement('div');
  previewDiv.classList.add('preview');
  previewDiv.style.display = textAreaDisplayProperties;
  previewDiv.tabIndex = 0;
  textArea.parentElement?.insertBefore(previewDiv, textArea);
  const classes = textArea.classList;
  classes.forEach(c => {
    previewDiv.classList.add(c);
  });
  textArea.classList.add('hidden');
  setPreviewHTML(previewDiv, textArea);
  previewEventListeners(previewDiv);
  return previewDiv;
}

function previewEventListeners(preview: HTMLDivElement) {
  const textArea = preview.parentElement?.querySelector('textarea') as HTMLTextAreaElement;
  function showTextArea() {
    textArea.classList.remove('hidden');
    textArea.style.display = textAreaDisplayProperties;
    utils.resizeTextarea(textArea);
    textArea.focus();
    preview.style.display = 'none';
  }
  ['click', 'focus'].forEach(e => {
    preview.addEventListener(e, showTextArea);
  });
}

addMessageButton.addEventListener('click', () => {
  addMessage();
});

window.addEventListener('resize', () => {
  textAreas.forEach(utils.resizeTextarea);
});

function textAreaEventListeners(textarea: HTMLTextAreaElement) {
  textarea.addEventListener('input', e => {
    utils.resizeTextarea(textarea);
  });
  textarea.addEventListener('focus', e => {
    utils.resizeTextarea(textarea);
  });
  textarea.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submitForm(e);
    }
  });
  textarea.addEventListener('blur', () => {
    const preview = textarea.parentElement?.querySelector('.preview') as HTMLDivElement;
    preview.style.display = textAreaDisplayProperties;
    setPreviewHTML(preview, textarea);
    textarea.style.display = 'none';
  });
}

function setPreviewHTML(preview: HTMLDivElement, textarea: HTMLTextAreaElement) {
  //@ts-ignore
  const parsedMarkdown = utils.getPreviewHtml(textarea.value);
  const previewHtml = textarea.value.trim() ? `<div>${parsedMarkdown}</div>` : `<span class="text-muted">${textarea.placeholder}</span>`;
  preview.innerHTML = previewHtml;
}

function switchRoleEventListeners(switchRole: HTMLButtonElement) {
  switchRole.addEventListener('click', e => {
    const currentRole = switchRole.getAttribute('data-role-type');
    const newRole = currentRole === userRole ? assistantRole : userRole;
    switchRole.setAttribute('data-role-type', newRole);
    switchRole.textContent = getIcon(newRole);
    switchRole.setAttribute('title', `Switch to (${currentRole})`);
    const txtArea = switchRole.parentElement?.querySelector('textarea');
    if (txtArea) {
      txtArea.placeholder = getRole(newRole).placeholder;
      const previewDiv = switchRole.parentElement?.querySelector('.preview');
      if (previewDiv) setPreviewHTML(previewDiv as HTMLDivElement, txtArea as HTMLTextAreaElement);
    }
  });
}

function messageDeleteButtonEventListener(messageDeleteButton: HTMLButtonElement) {
  messageDeleteButton.addEventListener('click', () => {
    utils.deleteMessage(messageDeleteButton);
  });
}

chatGPTForm.addEventListener('submit', e => {
  submitForm(e);
});

function addMessage(message = '', setAsAssistant = false) {
  const allRoles = document.querySelectorAll('.role-switch');
  const lastRoleType = allRoles[allRoles.length - 1]?.getAttribute('data-role-type') || assistantRole;
  const isUser = lastRoleType === userRole;
  const newRole = setAsAssistant ? assistantRole : isUser ? assistantRole : userRole;

  const inputGroup = document.createElement('div');
  inputGroup.className = 'chat-box';

  const switchRoleButton = document.createElement('button');
  switchRoleButton.className = 'btn btn-outline-secondary role-switch form-button';
  switchRoleButton.setAttribute('data-role-type', newRole);
  switchRoleButton.setAttribute('type', 'button');
  switchRoleButton.setAttribute('title', 'Switch Role');
  switchRoleButton.tabIndex = -1;
  switchRoleButton.textContent = getIcon(newRole);
  switchRoleEventListeners(switchRoleButton);

  const deleteMessageButton = document.createElement('button');
  deleteMessageButton.className = 'btn btn-outline-secondary message-delete form-button';
  const cross = String.fromCharCode(0x274c);
  deleteMessageButton.textContent = cross;
  deleteMessageButton.tabIndex = -1;
  deleteMessageButton.setAttribute('type', 'button');
  deleteMessageButton.setAttribute('title', 'Delete Message');
  messageDeleteButtonEventListener(deleteMessageButton);

  const messageInput = document.createElement('textarea');
  messageInput.className = 'form-control message-text';
  messageInput.placeholder = setAsAssistant ? 'Fetching response...' : getRole(newRole).placeholder;
  messageInput.setAttribute('aria-label', 'message');
  messageInput.setAttribute('rows', '1');
  messageInput.setAttribute('spellcheck', 'false');
  textAreaEventListeners(messageInput);

  inputGroup.append(switchRoleButton, messageInput, deleteMessageButton);
  messagesContainer.append(inputGroup);

  messageInput.value = message;
  messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  createPreviewDiv(messageInput);

  return messageInput;
}

function getMessages(): payloadMessage[] {
  const messages: payloadMessage[] = [];
  const messageInputs = document.querySelectorAll('#messages-container .chat-box');
  messageInputs.forEach(input => {
    const role = input.querySelector('button')?.dataset.roleType ?? '';
    const content = input.querySelector('textarea')?.value ?? '';
    if (!content?.trim()) return;
    messages.push({ role, content });
  });
  return messages;
}

async function submitForm(e: Event) {
  console.log("submitted");
  e.preventDefault();
  const messages = getMessages();
  if (messages.length === 0) return;
  let targetTextArea = null;
  let apiResponse = null;
  if (!apiKey) {
    window.location.reload();
    return;
  }
  try {
    targetTextArea = addMessage('', true) as HTMLTextAreaElement;
    const spinnerDiv = utils.addSpinner(messagesContainer);
    spinnerDiv.querySelector('button')?.addEventListener('click', () => {
      stopStream();
    });
    chatGPTData.apiKey = apiKey;
    chatGPTData.payloadMessages = messages;
    apiResponse = await openAIChatComplete(chatGPTData, targetTextArea);
  } catch (error) {
    if (targetTextArea) targetTextArea.value = 'Error fetching response.\n\n' + error;
  } finally {
    utils.removeSpinner();
    let lastMessage = targetTextArea;
    if (apiResponse?.result) lastMessage = addMessage();
    if (lastMessage) lastMessage.focus();
  }
}

const downloadMarkdownButton = document.getElementById('downloadMarkdown') as HTMLButtonElement;
downloadMarkdownButton.addEventListener('click', exports.downloadMarkdown);

const downloadHTMLButton = document.getElementById('downloadHTML') as HTMLButtonElement;
downloadHTMLButton.addEventListener('click', exports.downloadHTML);

const downloadPythonButton = document.getElementById('downloadPython') as HTMLButtonElement;

downloadPythonButton.addEventListener('click', e => {
  exports.downloadPython(getMessages(), chatGPTData.model);
});
// const enc = encrypt("hello", "key");
// const dec = decrypt(enc, "key");
// console.log(`enc:${enc} dec:${dec}`)
