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
const totalQuestions = 8;
const answers = {};
const scores = {};
let initialized = false;
let questionStartTime = null;

function initQuiz() {
  if (initialized) return;
  initialized = true;
  
  trackEvent('page_view');
  
  currentQuestion = 1;
  questionStartTime = Date.now();
  updateProgress();
  setupEventListeners();
  
  window.testNextQuestion = nextQuestion;
}

function setupEventListeners() {
  document.querySelectorAll('[data-action="next"]').forEach(button => {
    button.addEventListener('click', () => {
      const questionContent = button.closest('.question-content');
      const input = questionContent.querySelector('.text-input');

      if (input) {
        if (!input.value.trim()) {
          input.classList.add('error');
          input.focus();
          return;
        }
        input.classList.remove('error');
        answers[currentQuestion] = input.value;
        trackEvent('question_answer', { question: currentQuestion, answer: input.value });
      }

      if (currentQuestion === 1) {
        trackEvent('start_click');
      }

      if (currentQuestion === 8) {
        showLoadingThenResult();
      } else {
        nextQuestion();
      }
    });
  });

  const reviewTitles = document.querySelectorAll('[data-toggle="reviews"]');
  
  document.querySelectorAll('[data-toggle="reviews"]').forEach(title => {
    title.addEventListener('click', () => {
      const reviewItems = title.nextElementSibling;
      if (reviewItems && reviewItems.classList.contains('result-review-items')) {
        title.classList.toggle('collapsed');
        reviewItems.classList.toggle('collapsed');
      }
    });
    
    const reviewItems = title.nextElementSibling;
    if (reviewItems && reviewItems.classList.contains('result-review-items')) {
      title.classList.add('collapsed');
      reviewItems.classList.add('collapsed');
    }
  });

  const revealButtons = document.querySelectorAll('[data-reveal]');
  
  document.querySelectorAll('[data-reveal]').forEach(element => {
    if (element.classList.contains('result-goal-box') || element.tagName === 'BUTTON') {
      element.classList.add('shimmer-effect');
    }
    
    element.addEventListener('click', () => {
      const stepId = element.dataset.reveal;
      const targetSection = document.getElementById(stepId);
      
      if (stepId === 'step1-2') {
        trackEvent('reason_view_click');
      } else if (stepId === 'step1-3') {
        trackEvent('change_view_click');
      }
      
      if (targetSection) {
        targetSection.style.display = 'block';
        
        element.classList.remove('shimmer-effect');
        
        if (element.tagName === 'BUTTON') {
          element.style.display = 'none';
        }
        
        if (stepId === 'step-3' || stepId === 'step1-3') {
          const ctaButton = targetSection.querySelector('.result-cta-button');
          if (ctaButton) {
            ctaButton.classList.add('shimmer-effect');
            
            ctaButton.addEventListener('click', () => {
              trackEvent('course_cta_click', { url: ctaButton.href });
            }, { once: true });
          }
          
          setTimeout(() => {
            const stickyBar = document.getElementById('sticky-cta');
            if (stickyBar) {
              const stickyBtn = stickyBar.querySelector('.sticky-btn');
              stickyBtn.classList.add('shimmer-effect');
              stickyBtn.href = 'https://vo.la/발성의정석';
              
              stickyBar.classList.add('show');
            }
          }, 500);
        }
      }
    });
  });

  const optionButtons = document.querySelectorAll('.option-button');
  
  document.querySelectorAll('.option-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const value = e.target.dataset.value;
      const score = parseInt(e.target.dataset.score) || 0;
      const questionNum = e.target.closest('.question-content').dataset.question;
      answers[questionNum] = value;
      if (score > 0) {
        scores[questionNum] = score;
      }
      
      trackEvent('question_answer', { question: parseInt(questionNum), answer: value });
      
      nextQuestion();
    });
  });

  const submitButtons = document.querySelectorAll('[data-action="submit"]');
  
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
  
  document.querySelectorAll('[data-action="restart"]').forEach(button => {
    button.addEventListener('click', () => restart());
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
  
  if (questionStartTime) {
    const duration = (Date.now() - questionStartTime) / 1000;
    trackEvent('question_duration', { question: currentQuestion, duration: Math.round(duration) });
  }
  
  currentQuestion++;
  
  if (currentQuestion > totalQuestions) {
    showResult();
    return;
  }
  
  const next = document.querySelector(`.question-content[data-question="${currentQuestion}"]`);
  if (next) {
    next.classList.add('active');
    questionStartTime = Date.now();
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

function showLoadingThenResult() {
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
            showResult();
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
  
  let targetResult = '';
  let reasonHTML = '';
  let estimatedMonths = 0;
  
  let reason1 = '';
  const q1Answer = answers['2'];
  if (q1Answer === 'monthly') {
    reason1 = '노래를 한 달에 한번 하고 있다면 연습량이 부족해요.';
  } else if (q1Answer === 'weekly') {
    reason1 = '노래를 일주일에 한번 하고 있다면 연습량이 부족해요.';
  } else if (q1Answer === 'daily') {
    reason1 = '노래를 매일 하시는 건 잘하고 있어요.';
  }
  
  let reason2 = '';
  const q2Answer = answers['3'];
  let q2Text = '';
  if (q2Answer === 'high-note') {
    q2Text = '고음이 어렵다는';
  } else if (q2Answer === 'crack') {
    q2Text = '목소리가 갈라진다는';
  } else if (q2Answer === 'breath') {
    q2Text = '1절밖에 못 부르고 숨이 찬다는';
  }
  if (q2Text) {
    reason2 = `${q2Text} 문제는 내 목소리의 기준이 없어서입니다.<br>발성의 정석을 통해 지금 내 소리가 맞는지, 틀린지를 <br>스스로 구분할 수 있게 되면 자연스럽게 해결됩니다.`;
  }
  
  let reason3 = '';
  const q3Answer = answers['4'];
  if (q3Answer === 'sol2') {
    reason3 = '노래 쓸 수 있는 최고음이 2옥타브 솔 이하라면 음역대의 확장이 필수예요.<br>가성과 저음을 연결하는 법을 먼저 배우셔야 합니다.';
  } else if (q3Answer === 'unknown') {
    reason3 = '노래에 쓸 수 있는 최고음을 모른다면 음역대의 확장이 필요한 경우가 대부분이에요.<br>가성과 저음을 연결하는 법을 먼저 배우셔야 합니다.';
  } else if (q3Answer === 'do3') {
    reason3 = '현재 최고음이 3옥타브 도까지라면,<br>고음과 저음에서의 톤이 바뀌지 않는지, <br>내가 원하는 목소리가 나오는지를 점검하셔야 해요.<br><br>고음이 어떤 날은 되고, 어떤 날은 안되는 문제가 있을 수 있어요.<br><br>그렇다면 발성의 기준이 잡히지 않은 상태이니,<br>발성의 정석을 통해 기초발성을 다시 점검하시는 게 맞습니다.';
  } else if (q3Answer === 'sol3') {
    reason3 = '현재 최고음이 3옥타브 솔까지라면,<br>고음과 저음에서의 톤이 바뀌지 않는지,<br>내가 원하는 목소리가 나오는지를 점검하셔야 해요.<br><br>고음이 어떤 날은 되고, 어떤 날은 안되는 문제가 있을 수 있어요.<br><br>그렇다면 발성의 기준이 잡히지 않은 상태이니,<br>발성의 정석을 통해 기초발성을 다시 점검하시는 게 맞습니다.';
  }
  
  const reasonParts = [reason1, reason2, reason3].filter(r => r);
  reasonHTML = reasonParts.join('<br><br>');
  
  let insightText = '';
  
  if (totalScore >= 9) {
    targetResult = 'result1';
    estimatedMonths = 13;
  } else if (totalScore >= 6) {
    targetResult = 'result1';
    estimatedMonths = 11;
  } else {
    targetResult = 'result1';
    estimatedMonths = 9;
  }
  
  const goalSong = answers['8'] || '당신의 목표곡';
  
  trackEvent('result_view', { result_type: targetResult, total_score: totalScore, estimated_months: estimatedMonths });
  
  const result = document.querySelector(`.question-content[data-question="${targetResult}"]`);
  if (result) {
    const goalSongElements = result.querySelectorAll('.goal-song-result');
    const monthsEl = result.querySelector('.months-result');
    const dynamicReasonText = result.querySelector('.dynamic-reason-text');
    
    if (goalSongElements.length > 0) {
      goalSongElements.forEach(el => {
        el.textContent = goalSong;
      });
    }
    
    const stickyCTAGoalSong = document.querySelector('#sticky-cta .goal-song-result');
    if (stickyCTAGoalSong) {
      stickyCTAGoalSong.textContent = goalSong;
    }
    
    const stickyBtn = document.querySelector('#sticky-cta .sticky-btn');
    if (stickyBtn) {
      stickyBtn.href = 'https://vo.la/발성의정석';
      stickyBtn.innerHTML = "\'발성의 정석\' 0원으로 바로 보기 👉";
    }
    
    if (monthsEl) {
      monthsEl.textContent = estimatedMonths;
    }
    
    if (dynamicReasonText) {
      dynamicReasonText.innerHTML = reasonHTML;
    }
    
    const analysisBox = result.querySelector('.result-analysis-summary');
    if (analysisBox) {
      const insightTextEl = analysisBox.querySelector('.result-insight-text');
      if (insightTextEl && insightText) {
        insightTextEl.innerHTML = insightText;
      }
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
    
    const progressBar = document.querySelector('.progress-bar');
    const stickyBar = document.getElementById('sticky-cta');
    if (progressBar) progressBar.style.display = 'none';
    if (stickyBar) stickyBar.style.display = 'none';
    
    const flipCards = result.querySelectorAll('.flip-card');
    flipCards.forEach(card => {
      card.addEventListener('click', function() {
        this.querySelector('.flip-card-inner').classList.toggle('flipped');
        
        const anyFlipped = Array.from(flipCards).some(c => 
          c.querySelector('.flip-card-inner').classList.contains('flipped')
        );
        
        if (anyFlipped) {
          if (progressBar) progressBar.style.display = 'block';
          if (stickyBar) stickyBar.style.display = 'flex';
        }
      });
    });
  }
}

function restart() {
  initialized = false;
  currentQuestion = 1;
  questionStartTime = null;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initQuiz);
} else {
  initQuiz();
}
