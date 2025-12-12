function trackEvent(eventType, eventData = {}) {
  fetch('/analytics/track', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': document.querySelector('[name="csrf-token"]').content
    },
    body: JSON.stringify({
      event_type: eventType,
      event_data: eventData
    })
  }).catch(err => console.error('Tracking error:', err));
}

let currentQuestion = 1;
const totalQuestions = 10;
const answers = {};
const scores = {};
let initialized = false;

function initQuiz() {
  if (initialized) return;
  initialized = true;
  
  trackEvent('page_view');
  
  currentQuestion = 1;
  updateProgress();
  setupEventListeners();
}

function setupEventListeners() {
  const nextButtons = document.querySelectorAll('[data-action="next"]');
  nextButtons.forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
  document.querySelectorAll('[data-action="next"]').forEach(button => {
    button.addEventListener('click', () => {
      const questionContent = button.closest('.question-content');
      const input = questionContent.querySelector('.text-input');
      
      if (input && !input.value.trim()) {
        input.classList.add('error');
        input.focus();
        return;
      }
      
      if (input && input.value.trim()) {
        input.classList.remove('error');
        answers[currentQuestion] = input.value;
      }
      
      if (currentQuestion === 1) {
        trackEvent('start_click');
      }
      
      nextQuestion();
    });
  });

  const optionButtons = document.querySelectorAll('.option-button');
  optionButtons.forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
  document.querySelectorAll('.option-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const value = e.target.dataset.value;
      const score = parseInt(e.target.dataset.score) || 0;
      const resultPage = e.target.dataset.result;
      const questionNum = e.target.closest('.question-content').dataset.question;
      answers[questionNum] = value;
      if (score > 0) {
        scores[questionNum] = score;
      }
      
      trackEvent('question_answer', { question: parseInt(questionNum), answer: value });
      
      if (resultPage) {
        showLoadingThenResult(resultPage);
      } else {
        nextQuestion();
      }
    });
  });

  const submitButtons = document.querySelectorAll('[data-action="submit"]');
  submitButtons.forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
  document.querySelectorAll('[data-action="submit"]').forEach(button => {
    button.addEventListener('click', () => {
      const questionContent = button.closest('.question-content');
      const input = questionContent.querySelector('.text-input');
      if (input && input.value.trim()) {
        answers[currentQuestion] = input.value;
        showResult();
      }
    });
  });

  const restartButtons = document.querySelectorAll('[data-action="restart"]');
  restartButtons.forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
  document.querySelectorAll('[data-action="restart"]').forEach(button => {
    button.addEventListener('click', () => restart());
  });

  document.querySelectorAll('.text-input').forEach(input => {
    const newInput = input.cloneNode(true);
    input.replaceWith(newInput);
  });
  
  document.querySelectorAll('.text-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const questionContent = input.closest('.question-content');
        const nextButton = questionContent.querySelector('[data-action]');
        if (nextButton && input.value.trim()) {
          nextButton.click();
        }
      }
    });
  });
}

function nextQuestion() {
  const current = document.querySelector(`.question-content[data-question="${currentQuestion}"]`);
  if (current) {
    current.classList.remove('active');
  }
  
  currentQuestion++;
  
  if (currentQuestion > totalQuestions) {
    showResult();
    return;
  }
  
  const next = document.querySelector(`.question-content[data-question="${currentQuestion}"]`);
  if (next) {
    next.classList.add('active');
    trackEvent('question_view', { question: currentQuestion });
    updateProgress();
    updateQuestionNumber();
  }
}

function updateProgress() {
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    const progress = Math.min(100, ((currentQuestion - 1) / totalQuestions) * 100);
    progressFill.style.width = `${progress}%`;
  }
}

function updateQuestionNumber() {
  const questionNumberEl = document.querySelector('.question-number');
  if (questionNumberEl) {
    if (currentQuestion <= totalQuestions) {
      questionNumberEl.textContent = `${currentQuestion} / ${totalQuestions}`;
    } else {
      questionNumberEl.textContent = '';
    }
  }
}

function showLoadingThenResult(resultPage) {
  document.querySelectorAll('.question-content').forEach(q => q.classList.remove('active'));
  
  const thinkingScreen = document.querySelector('[data-question="thinking-screen"]');
  if (thinkingScreen) {
    thinkingScreen.classList.add('active');
    
    const video = thinkingScreen.querySelector('.thinking-video');
    const loadingBar = thinkingScreen.querySelector('.loading-progress-fill');
    const lightbulb = thinkingScreen.querySelector('.lightbulb-icon');
    
    const videoDuration = 3;
    const progressDuration = 3;
    
    if (video) {
      video.currentTime = 0;
      video.play();
      
      video.addEventListener('timeupdate', () => {
        if (video.currentTime >= videoDuration) {
          video.pause();
        }
      });
    }
    
    if (loadingBar) {
      const startTime = Date.now();
      const updateProgress = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min((elapsed / progressDuration) * 100, 100);
        loadingBar.style.width = `${progress}%`;
        
        if (progress < 100) {
          requestAnimationFrame(updateProgress);
        } else {
          if (lightbulb) {
            lightbulb.classList.add('show');
          }
          
          setTimeout(() => {
            if (thinkingScreen) {
              thinkingScreen.classList.remove('active');
              if (loadingBar) {
                loadingBar.style.width = '0%';
              }
              if (lightbulb) {
                lightbulb.classList.remove('show');
              }
            }
            showResult(resultPage);
          }, 500);
        }
      };
      requestAnimationFrame(updateProgress);
    }
  }
  
  const progressFill = document.querySelector('.progress-fill');
  if (progressFill) {
    progressFill.style.width = '95%';
  }
}

function showResult(resultPage) {
  document.querySelectorAll('.question-content').forEach(q => q.classList.remove('active'));
  
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  console.log('총 점수:', totalScore);
  console.log('각 질문 점수:', scores);
  
  let targetMonths;
  if (totalScore >= 12 && totalScore <= 17) {
    targetMonths = 3;
  } else if (totalScore >= 18 && totalScore <= 22) {
    targetMonths = 4;
  } else if (totalScore >= 23 && totalScore <= 28) {
    targetMonths = 6;
  } else {
    targetMonths = 3;
  }
  
  const goalSong = answers['9'] || '당신의 목표곡';
  const targetResult = resultPage || 'result1';
  
  trackEvent('result_view', { result_type: targetResult, total_score: totalScore });
  
  const result = document.querySelector(`.question-content[data-question="${targetResult}"]`);
  if (result) {
    const goalSongEl = result.querySelector('.goal-song-result');
    const monthsEl = result.querySelector('.months-result');
    const targetMonthsEl = result.querySelector('.target-months');
    
    if (goalSongEl) {
      goalSongEl.textContent = goalSong;
    }
    if (monthsEl) {
      monthsEl.textContent = totalScore;
    }
    if (targetMonthsEl) {
      targetMonthsEl.textContent = targetMonths + '개월';
    }
    
    result.classList.add('active');
    const progressFill = document.querySelector('.progress-fill');
    if (progressFill) {
      progressFill.style.width = '100%';
    }
    const questionNumberEl = document.querySelector('.question-number');
    if (questionNumberEl) {
      questionNumberEl.textContent = '';
    }
    
    const resultButtons = result.querySelectorAll('a.restart-button');
    resultButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        trackEvent('result_click', { result_type: targetResult, button_url: btn.href });
      });
    });
  }
}

function restart() {
  initialized = false;
  currentQuestion = 1;
  Object.keys(answers).forEach(key => delete answers[key]);
  Object.keys(scores).forEach(key => delete scores[key]);
  
  document.querySelectorAll('.question-content').forEach(q => q.classList.remove('active'));
  const firstQuestion = document.querySelector('.question-content[data-question="1"]');
  if (firstQuestion) {
    firstQuestion.classList.add('active');
  }
  
  document.querySelectorAll('.text-input').forEach(input => input.value = '');
  
  updateProgress();
  updateQuestionNumber();
  
  initialized = false;
  initQuiz();
}

document.addEventListener('turbo:load', initQuiz);
document.addEventListener('DOMContentLoaded', initQuiz);
