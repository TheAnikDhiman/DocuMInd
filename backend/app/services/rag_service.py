import google.generativeai as genai

from app.core.config import settings

genai.configure(api_key=settings.GEMINI_API_KEY)

model = genai.GenerativeModel("gemini-2.5-flash")


def ask_gemini(context_chunks, question):
    context = "\n\n".join(context_chunks)

    prompt = f"""
You are a helpful document assistant.

Only answer using the provided context.

If the answer is not present, say:

"I couldn't find this information in the uploaded document."

Context:
{context}

Question:
{question}
"""

    response = model.generate_content(prompt)

    return response.text