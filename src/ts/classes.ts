export const GLOBAL_CONFIGS = {
  apiKey: "",
};
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
  model: string = "gpt-4-0613" || "gpt-4-32k" || "gpt-3.5-turbo";
  stream: boolean = true;
  /**
   * What sampling temperature to use, between 0 and 2. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic.
   */
  temperature = 1;
  endPoint: string = "https://api.openai.com/v1/chat/completions";
  payloadMessages: payloadMessage[];
  static roles = {
    system: new payloadRole("system", "🧠", "sys", ""),
    user: new payloadRole("user", "👤", "usr", "Enter a user message here."),
    assistant: new payloadRole("assistant", "🤖", "ast", "Enter an assistant message here."),
  };

  constructor() {
    this.payloadMessages = [];
  }

  getRequestData() {
    try {
      //@ts-ignore
      gtag("event", "user_submit", {
        event_category: "user_input",
        event_label: "textbox_content",
        value: this.payloadMessages[this.payloadMessages.length - 1].content, // Pass the content of the textbox as the event value
      });
    } catch (e) {
      console.log("user gtag error:", e);
    }
    return {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GLOBAL_CONFIGS.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: this.payloadMessages,
        stream: this.stream,
        temperature: this.temperature,
      }),
    };
  }
}

/**
 * m for midjourney and d for dall-e
 */
export type IMAGE_GEN_TYPES = "m" | "d";
export class ImageGen {
  /**
   * The number of images to generate. Must be between 1 and 10.
   */
  n: number = 2;

  /**
   * Defaults to 1024x1024
   * The size of the generated images. Must be one of 256x256, 512x512, or 1024x1024.
   */
  size: string = "512x512";

  endPoints = { d: "https://api.openai.com/v1/images/generations", m: "https://asia-east1-slack-manage.cloudfunctions.net/samo" };
  response_format = "b64_json"; //"url"
  generatedImgs = 0;
  /**
   *
   * @param prompt A text description of the desired image(s). The maximum length is 1000 characters.
   * @returns
   */
  async getImages(prompt: string, type: IMAGE_GEN_TYPES) {
    prompt = prompt.substring(0, 1000);
    console.log("draw image:", prompt);
    let headers, body;
    if (type == "d") {
      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GLOBAL_CONFIGS.apiKey}`,
      };
      body = JSON.stringify({
        prompt,
        size: this.size,
        n: this.n,
        response_format: this.response_format,
      });
    } else {
      headers = {
        "Content-Type": "application/json",
      };
      body = JSON.stringify({
        // alwayson_scripts: {},
        batch_size: this.n,
        // cfg_scale: 7,
        // denoising_strength: 1,
        // do_not_save_grid: false,
        // do_not_save_samples: false,
        // enable_hr: false,
        // eta: 0,
        // firstphase_height: 0,
        // firstphase_width: 0,
        // height: 512,
        // hr_negative_prompt: "",
        // hr_prompt: "panda in forest, Comic style",
        // hr_resize_x: 512,
        // hr_resize_y: 512,
        // hr_sampler_name: "",
        // hr_scale: 2,
        // hr_second_pass_steps: 0,
        // hr_upscaler: "string",
        // n_iter: 1,
        // negative_prompt:
        //   "out of frame, worst quality, low quality, ugly,lgbt, morbid, extra fingers, mutated hands, poorly drawn hands, poorly drawn face,  deformed,  dehydrated, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
        // override_settings_restore_afterwards: true,
        prompt,
        // restore_faces: false,
        // s_churn: 0,
        // s_min_uncond: 0,
        // s_noise: 1,
        // s_tmax: 0,
        // s_tmin: 0,
        // sampler_index: "Euler a",
        // sampler_name: "Euler a",
        // save_images: true,
        // script_args: [],
        // script_name: "",
        // seed: -1,
        // seed_resize_from_h: -1,
        // seed_resize_from_w: -1,
        // send_images: true,
        // steps: 20,
        // styles: [],
        // subseed: -1,
        // subseed_strength: 0,
        // tiling: false,
        // width: 512,
      });
    }
    console.log(headers, body);
    const res = await fetch(this.endPoints[type], {
      method: "POST",
      headers,
      body,
    });

    if (type == "m") {
      const data = await res.json();
      console.log(data);
      if (data.images?.length > 1) data.images.shift();
      return data.images.map((u: any) => "data:image/jpeg;base64," + u);
    }
    const data = (await res.json()).data;
    console.log("result:", data);
    return data.map((u: any) => "data:image/jpeg;base64," + u[this.response_format]);
  }
}
