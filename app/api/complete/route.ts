import { NextResponse, type NextRequest } from "next/server"
import { CallbackManager } from "langchain/callbacks"
import { LLMChain } from "langchain/chains"
import { ChatOpenAI } from "langchain/chat_models/openai"
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
} from "langchain/prompts"

const prompt = ChatPromptTemplate.fromPromptMessages([
  HumanMessagePromptTemplate.fromTemplate("{input}"),
])

export async function POST(req: NextRequest) {
  try {
    const input = await req.json()
    console.log("input", input)
    // Check if the request is for a streaming response.
    const streaming = req.headers.get("accept") === "text/event-stream"
    console.log("server streaming", streaming)
    if (streaming) {
      // For a streaming response we need to use a TransformStream to
      // convert the LLM's callback-based API into a stream-based API.
      const encoder = new TextEncoder()
      const stream = new TransformStream()
      const writer = stream.writable.getWriter()
      console.log("creating llm")
      const llm = new ChatOpenAI({
        streaming,
        callbackManager: CallbackManager.fromHandlers({
          handleLLMNewToken: async (token: string) => {
            await writer.ready
            await writer.write(encoder.encode(`data: ${token}\n\n`))
          },
          handleLLMEnd: async () => {
            await writer.ready
            await writer.close()
          },
          handleLLMError: async (e: Error) => {
            await writer.ready
            await writer.abort(e)
          },
        }),
      })
      console.log("creating chain")
      const chain = new LLMChain({ prompt, llm })
      // We don't need to await the result of the chain.run() call because
      // the LLM will invoke the callbackManager's handleLLMEnd() method
      chain.call({ input }).catch((e: Error) => console.error(e))
      console.log("returning response")
      return new Response(stream.readable, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers":
            "Accept, Accept-Language, Content-Language, Content-Type",
          "Content-Type": "text/event-stream",
        },
      })
    } else {
      // For a non-streaming response we can just await the result of the
      // chain.run() call and return it.
      const llm = new ChatOpenAI()
      const chain = new LLMChain({ prompt, llm })
      const response = await chain.call({ input })
      // console.log(response.)

      //   return new Response(JSON.stringify(response), {
      //     headers: {
      //       //   "Access-Control-Allow-Origin": "*",
      //       //   "Access-Control-Allow-Methods": "POST",
      //       //   // "Access-Control-Allow-Headers": "Content-Type, Authorization",
      //       //   "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
      //       "Content-Type": "application/json",
      //     },

      //     status: 200,
      //   })
      // }
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
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as any).message }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Accept, Accept-Language, Content-Language, Content-Type",
        "Content-Type": "application/json",
      },
    })
  }
}

export const runtime = "edge"
