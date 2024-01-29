import * as templates from './templates';
import * as utils from './utils';
import marked from 'marked';

const htmlTemplate = templates.html;
const pythonTemplate = templates.python;

const brandLineMd = `ChatGPT`;

function getChats(): string {
  const textAreas = document.querySelectorAll('textarea');
  if (!textAreas.length) {
    utils.showModal('Message Export', 'No messages to download.', '');
    return '';
  }
  const text = Array.from(textAreas)
    .map(t => {
      const value = t.value.trim();
      if (!value) return '';
      const roleType = t.parentElement?.querySelector('button')?.getAttribute('data-role-type')?.toUpperCase() || 'UNKNOWN';
      return `**${roleType}**\n\n${value}\n\n---\n\n`;
    })
    .join('');
  return text;
}

export function downloadMarkdown() {
  const text = getChats();
  if (!text?.trim()) {
    utils.showModal('Markdown Export', 'No messages to download. Enter at least one prompt.', '');
    return;
  }
  const { dateString, timeString } = utils.getDateTimeStrings();
  const filename = `chatgpt-${dateString}-${timeString}.md`;
  const markdownText = `${text}\n\n${brandLineMd} on ${dateString} at ${timeString}`;
  utils.createDownloadLink(filename, markdownText, 'text/plain');
}

export function downloadHTML() {
  let text = getChats();
  if (!text?.trim()) {
    utils.showModal('HTML Export', 'No messages to download. Enter at least one prompt.', '');
    return;
  }
  const { dateString, timeString } = utils.getDateTimeStrings();
  const filename = `chatgpt-${dateString}-${timeString}.html`;
  // @ts-ignore
  text = marked.parse(`${text}\n\n${brandLineMd} on ${dateString} at ${timeString}`);
  text = htmlTemplate.replace('<!-- replace me  -->', text);
  utils.createDownloadLink(filename, text, 'text/html');
}

export function downloadPython(messages: any[], model: string) {
  if (!messages.length) {
    utils.showModal('Python Export', 'No messages to download. Enter at least one prompt.', '');
    return;
  }
  const pythonCode = pythonTemplate.replace('<!-- model name  -->', model).replace('<!-- messages  -->', JSON.stringify(messages));
  const { dateString, timeString } = utils.getDateTimeStrings();
  const filename = `chatgpt-${dateString}-${timeString}.py`;
  utils.createDownloadLink(filename, pythonCode, 'text/html');
}
