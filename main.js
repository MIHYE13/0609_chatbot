const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');


async function fetchGPTResponse(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [{"role": "user", "content": prompt}],
      temperature: 0.7,
    }),
  });


  const data = await response.json();
  return data.choices[0].message.content;
}


sendBtn.addEventListener('click', async () => {
  const prompt = userInput.value;
  if (!prompt) return;


  chatbox.innerHTML += `<div class="text-right mb-2 text-blue-600">나: ${prompt}</div>`;
  userInput.value = '';
  chatbox.scrollTop = chatbox.scrollHeight;


  const reply = await fetchGPTResponse(prompt);
  chatbox.innerHTML += `<div class="text-left mb-2 text-gray-800">GPT: ${reply}</div>`;
  chatbox.scrollTop = chatbox.scrollHeight;
});
