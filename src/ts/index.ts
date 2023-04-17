import { chatGPT, dallE, GLOBAL_CONFIGS } from './classes.js';
import { payloadMessage } from './classes.js';
import { payloadRole } from './classes.js';
import * as manageLS from './manageLocalStorage.js';
import * as utils from './utils.js';
import { openAIChatComplete, stopStream } from './openAI.js';
import * as exports from './export.js';
import { decrypt, encrypt } from './cryptography.js';

const chatgpt = new chatGPT();
const dalle = new dallE();
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
const drawButtons = document.querySelectorAll('.draw-btn') as NodeListOf<HTMLButtonElement>;

// initialize elements
GLOBAL_CONFIGS.apiKey = manageLS.getAPIKey() || "";

while (!GLOBAL_CONFIGS.apiKey.length) {
  const key = window.prompt("pass");
  try {
    if (key) {
      const enced = "U2FsdGVkX1/9lgY/dvhQbDC4jQW5jZo0XI6bBS9KzorJka0uOSjLYmn/LwuA3V9L6PERQZbvEoMwI1KPDCWY16AU1wgeOboU6RJRTk5D5DQ="
      const api = decrypt(enced, key);
      if (!api) {
        window.location.reload();
      } else {
        GLOBAL_CONFIGS.apiKey = api;
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
drawButtons.forEach(drawButtonEventListener);

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

function showTextArea(preview: HTMLDivElement, textArea: HTMLTextAreaElement) {
  console.log("showTextArea");
  textArea.classList.remove('hidden');
  textArea.style.display = textAreaDisplayProperties;
  // utils.resizeTextarea(textArea);
  textArea.focus();
  preview.style.display = 'none';
}
function previewEventListeners(preview: HTMLDivElement) {
  const textArea = preview.parentElement?.querySelector('textarea') as HTMLTextAreaElement;
  preview.addEventListener("dblclick", () => {
    console.log("preview:", preview)
    showTextArea(preview, textArea);
  });
  ['click', 'focus'].forEach(e => {
    preview.addEventListener(e, () => {
      if (textArea.getAttribute("data-role-type") != "assistant")
        showTextArea(preview, textArea);
    });
  });
}

addMessageButton.addEventListener('click', () => {
  addMessage();
});
function copyButtonEventListener(btn: HTMLButtonElement) {
  btn.addEventListener('click', async (e) => {
    if (e.target) {
      const el = (e.target as any).closest(".chat-box");
      if (!el) return;
      const txt = el.querySelector("textarea.message-text").value;
      utils.copyTextToClipboard(txt);
      var msg = true ? 'Copied!' : 'Whoops, not copied!';
      // @ts-ignore
      $(btn).attr('data-bs-title', msg).tooltip('show');
      // setTimeout(() => {
      //   // @ts-ignore
      //   $(btn).attr('data-bs-title', "copy to clipboard");
      // }, 2000);
    }
  });
}
function drawButtonEventListener(btn: HTMLButtonElement) {
  btn.addEventListener('click', async (e) => {
    if (e.target) {
      const el = (e.target as any).closest(".chat-box");
      if (!el) return;
      const txt = el.querySelector("textarea.message-text").value;
      const drawEl = el.querySelector(".draw-container .drawings");
      btn.disabled = true;
      await draw(txt, drawEl);
      btn.disabled = false;
    }
  });
}

// window.addEventListener('resize', () => {
//   textAreas.forEach(utils.resizeTextarea);
// });

function textAreaEventListeners(textarea: HTMLTextAreaElement) {
  // textarea.addEventListener('input', e => {
  //   utils.resizeTextarea(textarea);
  // });
  // textarea.addEventListener('focus', e => {
  //   utils.resizeTextarea(textarea);
  // });
  textarea.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submitForm(e);
    }
  });
  textarea.addEventListener('focus', e => {
    console.log("focus");
    //@ts-ignore
    autosize.update(textarea)
  });
  //@ts-ignore
  autosize(textarea);
  textarea.addEventListener('blur', () => {
    console.log("blur");
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
      txtArea.setAttribute("data-role-type", newRole);
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


async function draw(txt: string, drawEl: HTMLDivElement) {
  console.log(txt, drawEl);
  // const existingImgs = dalle.generatedImgs;// drawEl.querySelectorAll(".img-wrapper").length;
  // const collectionId = Date.now();
  const ids: string[] = [];
  for (let i = 0; i < dalle.n; i++) {
    const imgNum = ++dalle.generatedImgs;
    const imgId = `img_${imgNum}`;
    ids.push(imgId);
    const el = document.createElement("div");
    el.className = "col-md-6 img-wrapper";
    el.innerHTML = `<div class="card"><img id="${imgId}" src="imgs/loading.gif" class="card-img-top" alt="image ${imgNum}"><div class="card-body">
    <p class="card-text">
    <button class="btn btn-outline-success btn-circle" type="button" onclick="downloadImage(this.parentElement.parentElement.parentElement);"><span class="fas fa-download"></span></button>
    ${imgNum}
    <button class="btn btn-outline-danger btn-circle" type="button" onclick="this.parentElement.parentElement.parentElement.parentElement.remove();"><span class="fas fa-trash-alt"></span></button>
    </p></div></div>`
    drawEl.append(el);
  }
  try {
    const images = await dalle.getImages(txt);
    if (!images.length) throw "no image";
    let imagesId = 0;
    ids.forEach(id => {
      const img = drawEl.querySelector(`img#${id}`) as HTMLImageElement;
      img.src = images[imagesId++];
    })
  } catch (e) {
    console.log("error images:", e);
  }
}
function addMessage(message = '', setAsAssistant = false) {
  console.log("addMessage");
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
  messageInput.setAttribute('data-role-type', newRole);
  messageInput.className = 'form-control message-text';
  messageInput.placeholder = setAsAssistant ? 'Fetching response...' : getRole(newRole).placeholder;
  messageInput.setAttribute('aria-label', 'message');
  messageInput.setAttribute('rows', '1');
  messageInput.setAttribute('spellcheck', 'false');
  textAreaEventListeners(messageInput);

  inputGroup.append(switchRoleButton, messageInput, deleteMessageButton);

  // <button type="button" class=""></button>
  const copyBtn = document.createElement("button");
  copyBtn.className = "btn form-button copy-btn btn-dark";
  copyBtn.innerHTML = `copy <span class="fas fa-clipboard"></span>`;
  copyBtn.type = "button";
  copyBtn.setAttribute('data-toggle', "tooltip");
  copyBtn.setAttribute('data-placement', "top");
  copyBtn.setAttribute('title', "Copy to clipboard");
  inputGroup.append(copyBtn);
  copyButtonEventListener(copyBtn);

  const drawContainer = document.createElement("div");
  drawContainer.className = "input-group draw-container";
  const drawBtn = document.createElement("button");
  drawBtn.type = "button";
  drawBtn.className = "btn form-button draw-btn btn-dark";
  drawBtn.title = "Draw a pic";
  drawBtn.innerText = "Draw 🖼️";
  const drawings = document.createElement("div");
  drawings.className = "drawings row";
  drawContainer.append(drawings);
  drawContainer.append(drawBtn);
  inputGroup.append(drawContainer);
  drawButtonEventListener(drawBtn);

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
  if (!GLOBAL_CONFIGS.apiKey.length) {
    window.location.reload();
    return;
  }
  try {
    targetTextArea = addMessage('', true) as HTMLTextAreaElement;
    const spinnerDiv = utils.addSpinner(messagesContainer);
    spinnerDiv.querySelector('button')?.addEventListener('click', () => {
      stopStream();
    });
    chatgpt.payloadMessages = messages;
    apiResponse = await openAIChatComplete(chatgpt, targetTextArea);
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
  exports.downloadPython(getMessages(), chatgpt.model);
});
// const enc = encrypt("hello", "key");
// const dec = decrypt(enc, "key");
// console.log(`enc:${enc} dec:${dec}`)
