import openai

openai.api_key = "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"  # Replace with your actual API key

def chat_with_gpt(prompt):
    response = openai.Completion.create(
        engine="text-davinci-002",  # Use the appropriate engine for ChatGPT
        prompt=prompt,
        max_tokens=150,  # Control the response length
        temperature=0.7  # Control the creativity of responses (higher value -> more random)
    )
    return response['choices'][0]['text'].strip()

# Example usage
user_input = "Tell me a joke."
response = chat_with_gpt(user_input)
print(response)



