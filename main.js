// main.js

// VITE_OPENAI_API_KEY 환경 변수 사용 (Vite 프로젝트에서 .env 파일에 설정 필요)
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

// DOM 요소 가져오기
const chatbox = document.getElementById('chatbox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

// 대화 맥락 유지를 위한 메시지 히스토리 배열
// 시스템 메시지로 시작하여 챗봇의 역할을 정의합니다.
const conversationHistory = [];

// 챗봇의 페르소나, 목적, 대화 흐름을 정의하는 시스템 메시지
const systemMessage = {
  role: "system",
  content: `
    당신은 초등학교 1학년부터 6학년 친구들에게 딱 맞는 재미있고 유익한 책을 추천해 주는 친절하고 따뜻한 책 읽기 도우미입니다.
    당신의 이름은 '책갈피 요정'이며, 책 읽기를 좋아하는 친구들과 아직 책이 어려운 친구들 모두에게 즐거운 책 친구가 되어 주세요! 📚✨
    항상 밝고 친근하며, 초등학생 친구들이 이해하기 쉬운 어조와 단어를 사용해 주세요. 이모티콘도 적절히 사용하면 더 좋아요! 😊

    당신은 교보문고, Yes24 등에서 어린이들에게 인기 있고 좋은 평가를 받는 책들, 또는 오랫동안 사랑받아온 고전 책들 중에서 추천합니다.
    추천 기준은 다음과 같습니다:
    - 대상: 초등학교 1학년 ~ 6학년 (대화 중 학년을 묻지 않아도, 이 연령대에 맞는 책을 추천해야 합니다.)
    - 내용: 교훈이 있고 마음이 따뜻해지는 이야기
    - 최신성/지속성: 가급적 최근 10년 안에 출판되었거나, 시대를 초월하여 계속 읽히는 좋은 책
    - 다양성: 동화, 과학, 역사, 만화, 판타지 등 다양한 장르를 포함하여 추천 가능

    대화는 다음과 같은 흐름으로 진행됩니다:
    1. 먼저 친구에게 반갑게 인사하고, 어떤 종류의 책을 좋아하는지 또는 요즘 어떤 것에 관심이 있는지 부드럽게 물어보세요. (예: 신나는 모험 이야기, 귀여운 동물 이야기, 우주처럼 신비로운 이야기, 웃음이 빵 터지는 이야기 등)
    2. 친구의 대답을 잘 듣고, 그 취향에 맞는 책 3권을 추천 리스트로 제시해 주세요. 추천하는 각 책에 대해 왜 친구에게 좋을지 간단하게 설명도 잊지 마세요. 이때, 책 이름, 작가, 간단한 소개를 포함해주세요.
    3. 추천 리스트를 제시한 후, "이 중에서 어떤 책이 제일 읽고 싶어? 하나만 골라주면 책갈피 요정이 더 자세한 이야기를 들려줄게!" 와 같이 말하며 친구가 한 권을 선택하도록 유도해 주세요.
    4. 친구가 고른 책에 대해 간단한 줄거리(스포일러 없이!)를 이야기해 주세요. 특히 이 책을 읽으면 어떤 교훈이나 따뜻한 마음을 느낄 수 있는지에 초점을 맞춰 설명해 주세요.
    5. 마지막으로 책 읽는 즐거움을 응원하고, 다음에 또 책 추천이 필요하면 언제든 다시 찾아오라고 말하며 대화를 마무리해 주세요.

    대화 중에는 항상 이전 대화 내용을 기억하며 자연스럽게 이어가도록 노력해 주세요. 친구의 질문이나 이야기에 귀 기울이고 공감하는 반응을 보여주세요.
    응답 시작 시에는 '책갈피 요정: '이라고 말하며 자신의 이름을 밝혀주세요.

    당신은 'gpt-4o' 모델입니다. 이 모델의 뛰어난 대화 능력과 방대한 도서 지식을 활용하여 친구들에게 최고의 책 친구가 되어 주세요! ✨
    `
};

// 시스템 메시지를 대화 기록의 시작에 추가
conversationHistory.push(systemMessage);

// OpenAI API에 메시지 히스토리를 보내고 응답을 받는 비동기 함수
async function fetchGPTResponse(messages) {
  // API 키가 없으면 오류 반환
  if (!apiKey) {
    console.error("OpenAI API key is not set.");
    displayMessage("죄송해요, 지금은 책 이야기를 나눌 수 없어요. 관리자에게 문의해주세요. 😢", 'bot');
    return null; // API 호출 실패 시 null 반환
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o", // 최신 모델 사용
        messages: messages, // 대화 히스토리 전달
        temperature: 0.8, // 창의적인 응답을 위해 온도 설정
        max_tokens: 800 // 응답 최대 길이 제한 (필요에 따라 조절)
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API error:", response.status, errorData);
      throw new Error(`API 요청 실패: ${response.status} (${errorData.error ? errorData.error.message : '알 수 없는 오류'})`);
    }

    const data = await response.json();
    return data.choices[0].message.content;

  } catch (error) {
    console.error("Fetch error:", error);
    // 오류 발생 시 사용자에게 안내 메시지 표시
    displayMessage(`앗! 책 이야기를 가져오는데 문제가 생겼어요. 다시 시도해 줄래요? 😥 (오류: ${error.message})`, 'bot');
    return null; // API 호출 실패 시 null 반환
  }
}

// 보내기 버튼 클릭 이벤트 리스너
sendBtn.addEventListener('click', async () => {
  const prompt = userInput.value.trim(); // 입력 값 앞뒤 공백 제거
  if (!prompt) return; // 입력 값이 비어있으면 아무것도 하지 않음

  // 사용자 메시지를 대화 기록에 추가 및 화면에 표시
  conversationHistory.push({ role: 'user', content: prompt });
  displayMessage(prompt, 'user'); // '나:' 접두사 없이 내용만 표시

  // 입력 필드 초기화 및 스크롤
  userInput.value = '';
  scrollToBottom();

  // 로딩 메시지 표시
  const loadingMessageDiv = displayMessage("책갈피 요정이 어떤 책이 좋을지 고민 중이에요... 🧚‍♀️", 'loading');
  scrollToBottom();

  // 버튼 및 입력 비활성화
  sendBtn.disabled = true;
  userInput.disabled = true;


  // GPT 응답 가져오기
  const reply = await fetchGPTResponse(conversationHistory);

  // 로딩 메시지 제거
  if (loadingMessageDiv) { // 로딩 메시지 요소가 있는지 확인
     loadingMessageDiv.remove();
  }


  // GPT 응답이 유효하면 대화 기록에 추가 및 화면에 표시
  if (reply !== null) {
      conversationHistory.push({ role: 'assistant', content: reply });
      displayMessage(reply, 'bot'); // '책갈피 요정:' 접두사는 AI 응답에 포함될 것으로 예상
  }


  // 스크롤
  scrollToBottom();

  // 버튼 및 입력 다시 활성화
  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.focus(); // 입력 필드에 포커스
});

// Enter 키 눌렀을 때도 메시지 전송
userInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter' && !sendBtn.disabled && !userInput.disabled) {
    event.preventDefault(); // 기본 엔터 동작(줄바꿈) 방지
    sendBtn.click(); // 버튼 클릭 이벤트 실행
  }
});


// 메시지를 화면에 표시하는 함수
function displayMessage(text, sender) {
  const messageElement = document.createElement('div');
  // text-right 또는 text-left 클래스는 상위 div에 적용하여 flexbox 정렬 또는 float에 사용
  messageElement.className = `mb-2 ${sender === 'user' ? 'text-right' : 'text-left'}`;

  const bubbleElement = document.createElement('div');
  bubbleElement.textContent = text; // 텍스트 내용 설정

  // 버블 스타일 클래스 추가
  let bubbleClasses = 'p-2 inline-block rounded-lg max-w-xs break-words';
  if (sender === 'user') {
    bubbleClasses += ' user-message-bubble'; // 사용자 메시지 버블 스타일 클래스
  } else if (sender === 'bot') {
    bubbleClasses += ' bot-message-bubble'; // 봇 메시지 버블 스타일 클래스
  } else if (sender === 'loading') {
     bubbleClasses += ' loading-message-bubble italic'; // 로딩 메시지 버블 스타일 클래스
  }
  bubbleElement.className = bubbleClasses;

  messageElement.appendChild(bubbleElement);
  chatbox.appendChild(messageElement);

  return messageElement; // 로딩 메시지 제거를 위해 요소 반환
}

// 채팅창 스크롤을 항상 아래로 이동시키는 함수
function scrollToBottom() {
  chatbox.scrollTop = chatbox.scrollHeight;
}

// 페이지 로드 시 입력 필드에 포커스
window.addEventListener('load', () => {
    userInput.focus();
});