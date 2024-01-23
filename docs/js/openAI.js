import { chatGPT } from './classes.js';
import { getPreviewHtml } from './utils.js';
let reader;
export function stopStream() {
    console.log('Reader is: ' + reader);
    if (reader) {
        reader.cancel();
    }
}
export async function openAIChatComplete(gptData, textArea, toJB = false) {
    const previewDiv = textArea.parentElement?.querySelector('.preview');
    const url = gptData.endPoint;
    const requestData = gptData.getRequestData(toJB);
    let response;
    try {
        response = await fetch(url, requestData);
        // check for response errors
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`${error.error.code}\n${error.error.message}`);
        }
        reader = response.body?.getReader();
        let responseText = '';
        const onData = (chunk) => {
            const textDecoder = new TextDecoder();
            const jsonString = textDecoder.decode(chunk, { stream: true });
            console.log('jsonString before split:', jsonString);
            let jsonStrings = jsonString.split('data:');
            console.log('jsonString after split:', jsonString);
            jsonStrings = jsonStrings.map((str) => {
                if (str.includes('[DONE]')) {
                    return str.replace('[DONE]', '');
                }
                return str;
            });
            jsonStrings = jsonStrings
                .map((str) => str.trim())
                .filter((str) => str.length > 0);
            console.log('jsonString after trim:', jsonString);
            // textArea.classList.remove('hidden');
            // previewDiv.classList.add('hidden');
            textArea.classList.add('hidden');
            previewDiv.classList.remove('hidden');
            for (let i = 0; i < jsonStrings.length; i++) {
                const responseData = JSON.parse(jsonStrings[i]);
                const choices = responseData.choices;
                if (choices && choices.length > 0) {
                    const delta = choices[0].delta;
                    if (delta && delta.content) {
                        const content = delta.content;
                        responseText += content;
                        updateTextAreaAndPreview(textArea, previewDiv, content);
                    }
                }
            }
        };
        const onDone = () => {
            updateTextAreaAndPreview(textArea, previewDiv, responseText, true);
            try {
                //@ts-ignore
                gtag('event', 'gpt_submit', {
                    event_category: 'user_input',
                    event_label: 'textbox_content',
                    value: responseText // Pass the content of the textbox as the event value
                });
            }
            catch (e) {
                console.log('gpt gtag error:', e);
            }
        };
        const read = () => {
            return reader?.read().then(({ done, value }) => {
                if (done) {
                    onDone();
                    return;
                }
                onData(value);
                return read();
            });
        };
        await read();
        return { result: true, response: responseText.trim() };
    }
    catch (error) {
        const errorMsg = `${error}`;
        updateTextAreaAndPreview(textArea, previewDiv, errorMsg, true, true);
        console.error(error);
        return { result: false, response: errorMsg };
    }
    finally {
        textArea.placeholder = chatGPT.roles['assistant'].placeholder;
    }
}
function updateTextAreaAndPreview(textArea, previewDiv, text, responseComplete = false, error = false) {
    textArea.value += text;
    textArea.value = textArea.value.trimStart();
    // @ts-ignore
    previewDiv.innerHTML = getPreviewHtml(textArea.value);
    // resizeTextarea(textArea);
    // textArea.scrollHeight;
    if (responseComplete) {
        textArea.value = error ? textArea.value + `\n\nERROR:${text}` : text.trim();
        // @ts-ignore
        previewDiv.innerHTML = getPreviewHtml(textArea.value);
        // resizeTextarea(textArea);
        // textArea.classList.add('hidden');
        // previewDiv.classList.remove('hidden');
    }
}
export default openAIChatComplete;
