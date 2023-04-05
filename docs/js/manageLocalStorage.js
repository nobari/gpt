import * as crypto from './cryptography.js';
const LOCAL_STORAGE_API_KEY = 'chatGPTPlaygroundAPIKey';
const LOCAL_STORAGE_MODEL_KEY = 'chatGPTPlaygroundModel';
// Get the API key from local storage
export function getAPIKey() {
    const encryptedString = localStorage.getItem(LOCAL_STORAGE_API_KEY);
    if (encryptedString) {
        try {
            const decryptedString = crypto.decrypt(encryptedString);
            // console.log("api:", decryptedString);
            return decryptedString;
        }
        catch (error) {
            console.log('Error decrypting API key: ' + error);
            return '';
        }
    }
}
// Save the API key to local storage
export function setAPIKey(key) {
    const encryptedString = crypto.encrypt(key);
    localStorage.setItem(LOCAL_STORAGE_API_KEY, encryptedString);
}
// Save the model to local storage
export function setModel(model) {
    localStorage.setItem(LOCAL_STORAGE_MODEL_KEY, model);
}
