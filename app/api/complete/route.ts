import { NextResponse, type NextRequest } from "next/server"
import { ENV } from "@/utils/Env"
import { ChatOpenAI } from "langchain/chat_models/openai"
import { PromptTemplate } from "langchain/prompts"

const config = `% TONE
- Don't use any emojis or hashtags.
- Respond in a casual tone.
- Use slang and contractions but don't add apostrophes to words.

% FORMAT
- Keep your reply under 80 characters and in one sentence.
- Intentionally avoid punctuation, use incorrect grammar and use incorrect capitalization sometimes.
- Don't use any special characters.

YOUR REPLY:`

const template = `
    Please create a reply to the tweet below and add value.
    {tweet}

    ${config}
    `

const templateWithReply = `
    Please create a reply to the tweet below and add value.
    {tweet}

    I've already started the reply for you with the following text:
    "{reply}"

    ${config}
    `

const prompt = PromptTemplate.fromTemplate(template)
const promptWithReply = PromptTemplate.fromTemplate(templateWithReply)

export async function POST(req: NextRequest) {
  try {
    const { tweet, reply } = await req.json()
    const llm = new ChatOpenAI({
      temperature: ENV.TEMPERATURE,
    })
    let inputPrompt = ""
    if (reply.length > 1) {
      inputPrompt = await promptWithReply.format({ tweet, reply })
    } else {
      inputPrompt = await prompt.format({ tweet })
    }
    const response = await llm.predict(inputPrompt)

    console.log("response: ", response)

    return NextResponse.json(JSON.stringify(response), {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Accept, Accept-Language, Content-Language, Content-Type",

        "Content-Type": "application/json",
        PreContinue: "true",
      },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any).message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Accept, Accept-Language, Content-Language, Content-Type",

        "Content-Type": "application/json",
        PreContinue: "true",
      },
    })
  }
}

export const runtime = "edge"
