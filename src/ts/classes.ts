export const GLOBAL_CONFIGS = {
  apiKey: ""
}
export class payloadRole {
  role: string;
  icon: string;
  short: string;
  placeholder: string;
  constructor(role: string, icon: string, short: string, placeholder: string) {
    this.role = role;
    this.icon = icon;
    this.short = short;
    this.placeholder = placeholder;
  }
}

export class payloadMessage {
  role: string;
  content: string;
  constructor(role: string, content: string) {
    this.role = role;
    this.content = content;
  }
}

export class chatGPT {
  model: string = 'gpt-4-0314' || "gpt-3.5-turbo";
  stream: boolean = true;
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   */
  temperature = 1;
  endPoint: string = 'https://api.openai.com/v1/chat/completions';
  payloadMessages: payloadMessage[];
  static roles = {
    system: new payloadRole('system', '🧠', 'sys', ''),
    user: new payloadRole('user', '👤', 'usr', 'Enter a user message here.'),
    assistant: new payloadRole('assistant', '🤖', 'ast', 'Enter an assistant message here.'),
  };

  constructor() {
    this.payloadMessages = [];
  }

  getRequestData() {
    try {
      //@ts-ignore
      gtag('event', 'user_submit', {
        'event_category': 'user_input',
        'event_label': 'textbox_content',
        'value': this.payloadMessages[this.payloadMessages.length - 1].content // Pass the content of the textbox as the event value
      });
    } catch (e) { console.log("user gtag error:", e) }
    return {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GLOBAL_CONFIGS.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.payloadMessages,
        stream: this.stream,
        temperature: this.temperature
      }),
    };
  }
}
export class dallE {



  /**
   * The number of images to generate. Must be between 1 and 10.
   */
  n: number = 2

  /**
   * Defaults to 1024x1024
   * The size of the generated images. Must be one of 256x256, 512x512, or 1024x1024.
   */
  size: string = "512x512"

  endPoint: string = 'https://api.openai.com/v1/images/generations';
  response_format = "b64_json"//"url"
  generatedImgs = 0;
  /**
   * 
   * @param prompt A text description of the desired image(s). The maximum length is 1000 characters.
   * @returns 
   */
  async getImages(prompt: string) {
    prompt = prompt.substring(0, 1000);
    console.log("draw image:", prompt)
    const res = await fetch(this.endPoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GLOBAL_CONFIGS.apiKey}`,
      },
      body: JSON.stringify({
        prompt,
        size: this.size,
        n: this.n,
        response_format: this.response_format
      }),
    });
    const data = (await res.json()).data;
    console.log("result:", data);
    return data.map((u: any) => "data:image/jpeg;base64," + u[this.response_format]);
  }
}
