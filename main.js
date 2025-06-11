const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

// [수정] AI에게 역할을 부여하는 '마스터 프롬프트'
const AI_MASTER_PROMPT = `
당신은 대한민국 초등학생들을 위한 음악 추천 전문가 '음악 요정'입니다.
당신은 멜론, 지니, 벅스 등 주요 음원 사이트의 최신 인기 차트를 참고하여 노래를 추천해야 합니다.
사용자가 요청하는 장르에 맞춰, 아래의 세부 기준에 따라 단 한 곡만 추천해주세요.
- 동요: 초등학교 교과서에 나오는 친근한 노래
- 가요: 한국 가수와 해외 가수 포함, 학생들이 따라 부르기 쉽고 인기도 높은 노래
- 클래식: 모차르트, 베토벤 등 유명한 음악가의 대표적인 곡
- OST: 초등학생이 볼 만한 최신 인기 애니메이션 주제곡
- 의식행사 음악: 삼일절, 어버이날, 졸업식 등 특별한 날에 부르는 노래
- 무작위: 앞서 언급한 모든 장르 중에서 무작위로 한 곡 추천
답변은 반드시 '아티스트 - 노래 제목' 형식으로만, 다른 설명 없이 간결하게 응답해야 합니다.
`;

let player, stopTimer;
let playHistory = [];
let historyIndex = -1;

// (HTML 요소 변수 선언은 이전과 동일하여 생략...)
const videoCover = document.getElementById('video-cover');
const coverMainText = document.getElementById('cover-main-text');
const songTitleBox = document.getElementById('song-title-box');
const controlButtons = document.querySelectorAll('.control-button');
const genreButtons = document.querySelectorAll('.genre-button');
const prevSongBtn = document.getElementById('prev-song-btn');
const play5sBtn = document.getElementById('play-5s-btn');
const play10sBtn = document.getElementById('play-10s-btn');
const play20sBtn = document.getElementById('play-20s-btn');
const playAllBtn = document.getElementById('play-all-btn');
const toggleScreenBtn = document.getElementById('toggle-screen-btn');

async function fetchAISongSuggestion(genre) {
    coverMainText.textContent = `AI에게 '${genre}' 장르 노래 추천받는 중... 🧚‍♀️`;
    videoCover.classList.remove('hidden');
    const historyPrompt = playHistory.map(song => song.title).join(', ');
    
    // [수정] 마스터 프롬프트에 구체적인 명령을 추가하는 방식
    const userInstruction = `이제 '${genre}' 장르에서 노래를 한 곡 추천해줘. 단, 이 목록에 있는 노래는 제외해줘: [${historyPrompt}]`;

    if (!OPENAI_API_KEY) { alert('오류: OpenAI API 키가 설정되지 않았습니다.'); return null; }

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: AI_MASTER_PROMPT },
                    { role: "user", content: userInstruction }
                ],
                temperature: 1.0, max_tokens: 60
            }),
        });
        if (!response.ok) throw new Error(`OpenAI API request failed with status ${response.status}`);
        const data = await response.json();
        return data.choices[0].message.content.trim();
    } catch (error) { console.error("AI 추천 오류:", error); alert("AI가 노래를 추천하는 데 실패했어요."); return null; }
}

async function fetchYouTubeVideo(query) {
    coverMainText.textContent = "유튜브에서 영상 찾는 중... 🎬";
    // [수정] 가사 우선 + 인기순 + 안전 검색 필터 적용
    const searchQuery = `${query} (가사 OR lyrics OR Official M/V OR 공식 뮤직비디오)`;
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&key=${YOUTUBE_API_KEY}&type=video&videoEmbeddable=true&maxResults=5&order=viewCount&safeSearch=strict`;

    if (!YOUTUBE_API_KEY) { alert('오류: YouTube API 키가 설정되지 않았습니다.'); return null; }

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`YouTube API request failed with status ${response.status}`);
        const data = await response.json();
        if (data.items.length === 0) throw new Error('검색 결과 없음');
        return { videoId: data.items[0].id.videoId, title: query };
    } catch (error) { console.error("유튜브 검색 오류:", error); alert("추천받은 노래의 영상을 유튜브에서 찾지 못했어요."); return null; }
}

// (이하 나머지 게임 로직 함수들은 이전 답변과 동일하여 생략...)
window.onYouTubeIframeAPIReady = function() {
    player = new YT.Player('youtube-player', {
        height: '360', width: '640',
        playerVars: { 'autoplay': 0, 'controls': 0, 'rel': 0, 'iv_load_policy': 3 },
        events: { 'onReady': onPlayerReady }
    });
}

function onPlayerReady() { setInitialScreen(); }

function setInitialScreen() {
    songTitleBox.textContent = "원하는 장르를 선택해주세요!";
    songTitleBox.classList.add('initial-state');
    videoCover.classList.add('hidden');
    playHistory = [];
    historyIndex = -1;
    updateNavButtonsState();
    controlButtons.forEach(btn => btn.disabled = true);
}

function updateNavButtonsState() {
    prevSongBtn.disabled = historyIndex <= 0;
}

function loadSong(song) {
    toggleScreenBtn.textContent = '화면 가리기 🙈';
    songTitleBox.classList.remove('initial-state', 'revealed');
    controlButtons.forEach(btn => btn.disabled = false);
    songTitleBox.textContent = song.title;
    player.cueVideoById(song.videoId);
    updateNavButtonsState();
}

async function handleGenreClick(genre) {
    let targetGenre = genre;
    if (targetGenre === '무작위') {
        // [수정] 무작위 프롬프트도 AI에게 직접 요청
        targetGenre = '무작위'; 
    }

    genreButtons.forEach(btn => btn.disabled = true);
    prevSongBtn.disabled = true;

    try {
        const songSuggestion = await fetchAISongSuggestion(targetGenre);
        if (!songSuggestion) return;
        
        const videoData = await fetchYouTubeVideo(songSuggestion);
        if (!videoData) return;

        const newSong = { title: videoData.title, videoId: videoData.videoId };
        
        playHistory = playHistory.slice(0, historyIndex + 1);
        playHistory.push(newSong);
        historyIndex = playHistory.length - 1;
        
        loadSong(newSong);

    } finally {
        genreButtons.forEach(btn => btn.disabled = false);
        updateNavButtonsState();
    }
}

function loadPreviousSong() {
    if (historyIndex <= 0) return;
    historyIndex--;
    loadSong(playHistory[historyIndex]);
}

function playForDuration(seconds) {
    if (historyIndex < 0) return;
    clearTimeout(stopTimer);
    player.seekTo(0);
    player.playVideo();
    stopTimer = setTimeout(() => player.pauseVideo(), seconds * 1000);
}

function playAll() {
    if (historyIndex < 0) return;
    clearTimeout(stopTimer);
    player.seekTo(0);
    player.playVideo();
}

function toggleScreen() {
    if (historyIndex < 0) return;
    const isHidden = videoCover.classList.toggle('hidden');
    toggleScreenBtn.textContent = isHidden ? '화면 가리기 🙈' : '화면 보기 🐵';
}

genreButtons.forEach(button => {
    button.addEventListener('click', () => {
        const genre = button.dataset.genre;
        handleGenreClick(genre);
    });
});

prevSongBtn.addEventListener('click', loadPreviousSong);
songTitleBox.addEventListener('click', () => { if (!songTitleBox.classList.contains('initial-state')) songTitleBox.classList.toggle('revealed'); });
play5sBtn.addEventListener('click', () => playForDuration(5));
play10sBtn.addEventListener('click', () => playForDuration(10));
play20sBtn.addEventListener('click', () => playForDuration(20));
playAllBtn.addEventListener('click', playAll);
toggleScreenBtn.addEventListener('click', toggleScreen);