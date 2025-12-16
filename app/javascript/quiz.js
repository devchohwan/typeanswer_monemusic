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
let questionStartTime = null;

function initQuiz() {
  if (initialized) return;
  initialized = true;
  
  trackEvent('page_view');
  
  currentQuestion = 1;
  questionStartTime = Date.now();
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
        trackEvent('question_answer', { question: currentQuestion, answer: input.value });
      }

      if (currentQuestion === 1) {
        trackEvent('start_click');
      }

      nextQuestion();
    });
  });

  const reviewTitles = document.querySelectorAll('[data-toggle="reviews"]');
  reviewTitles.forEach(title => {
    title.replaceWith(title.cloneNode(true));
  });
  
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
  revealButtons.forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
  document.querySelectorAll('[data-reveal]').forEach(element => {
    if (element.classList.contains('result-goal-box') || element.tagName === 'BUTTON') {
      element.classList.add('shimmer-effect');
    }
    
    element.addEventListener('click', () => {
      const stepId = element.dataset.reveal;
      const targetSection = document.getElementById(stepId);
      
      trackEvent('reveal_click', { step_id: stepId, element_type: element.tagName.toLowerCase() });
      
      if (targetSection) {
        targetSection.style.display = 'block';
        
        element.classList.remove('shimmer-effect');
        element.classList.remove('shake-attention');
        
        if (element.tagName === 'BUTTON') {
          element.style.display = 'none';
        }
        
        if (stepId === 'step-3' || stepId === 'step1-3') {
          const timelineItems = targetSection.querySelectorAll('.timeline-item');
          timelineItems.forEach(item => {
            const delay = parseInt(item.dataset.delay) || 0;
            setTimeout(() => {
              item.classList.add('show');
            }, delay);
          });
          
          const ctaButton = targetSection.querySelector('.result-cta-button');
          if (ctaButton) {
            ctaButton.classList.add('shimmer-effect');
          }
          
          setTimeout(() => {
            const stickyBar = document.getElementById('sticky-cta');
            if (stickyBar) {
              const stickyBtn = stickyBar.querySelector('.sticky-btn');
              stickyBtn.classList.add('shimmer-effect');
              
              if (stepId === 'step1-3') {
                stickyBtn.href = 'https://vo.la/발성의정석';
              } else if (stepId === 'step-3') {
                stickyBtn.href = 'https://vo.la/w9LoHR';
              }
              
              stickyBar.classList.add('show');
            }
          }, 1500);
        }
        
        if (stepId === 'step1-2' || stepId === 'step-2') {
          setTimeout(() => {
            const nextRevealBtn = targetSection.querySelector('[data-reveal]');
            if (nextRevealBtn && !nextRevealBtn.classList.contains('shake-attention')) {
              nextRevealBtn.classList.add('shake-attention');
              setTimeout(() => {
                nextRevealBtn.classList.remove('shake-attention');
              }, 800);
            }
          }, 3000);
        }
      }
    });
    
    if (element.dataset.reveal === 'step1-2' || element.dataset.reveal === 'step-2') {
      setTimeout(() => {
        if (element.offsetParent !== null && !element.classList.contains('shake-attention')) {
          element.classList.add('shake-attention');
          
          const shakeInterval = setInterval(() => {
            const targetSection = document.getElementById(element.dataset.reveal);
            if (!targetSection || targetSection.style.display === 'block') {
              clearInterval(shakeInterval);
              element.classList.remove('shake-attention');
            } else {
              element.classList.add('shake-attention');
              setTimeout(() => {
                element.classList.remove('shake-attention');
              }, 800);
            }
          }, 5000);
        }
      }, 2000);
    }
  });


  const optionButtons = document.querySelectorAll('.option-button');
  optionButtons.forEach(button => {
    button.replaceWith(button.cloneNode(true));
  });
  
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
      
      if (questionNum === '10') {
        showLoadingThenResult();
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
  
  const stickyBtn = document.querySelector('#sticky-cta .sticky-btn');
  if (stickyBtn) {
    stickyBtn.addEventListener('click', (e) => {
      trackEvent('sticky_cta_click', { 
        button_url: stickyBtn.href,
        button_text: stickyBtn.textContent.trim()
      });
    });
  }
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
  
  if (totalScore >= 18) {
    targetResult = 'result2';
    estimatedMonths = 18;
    reasonHTML = `지금 상태에서는<br><strong>혼자 연습만으로 해결이 어려운 단계예요.</strong><br>실제 수강생 데이터 기준으로도,<br>이 단계에서는 <strong>직접 교정</strong>이 거의 필수였어요.`;
  } else if (totalScore >= 13) {
    targetResult = 'result2';
    estimatedMonths = 15;
    reasonHTML = `지금 상태에서는<br><strong>혼자 연습만으로 해결하기 어려운 구간</strong>에 와 있어요.<br>실제 수강생 데이터 기준으로도,<br>이 단계에서는 <strong>직접 교정</strong>여부가 큰 차이를 만들어요.`;
  } else if (totalScore >= 9) {
    targetResult = 'result1';
    estimatedMonths = 13;
    reasonHTML = `온라인으로 시작은 가능하지만<br><strong>방향을 잘못 잡으면 시행착오</strong>가 길어질 수 있어요.<br>포인트가 명확히 정리된 강의로<br><strong>올바른 감각</strong>을 먼저 익히세요.`;
  } else if (totalScore >= 6) {
    targetResult = 'result1';
    estimatedMonths = 11;
    reasonHTML = `지금 상태에서는<br><strong>온라인 교정만으로도 충분히</strong> 변화를 만들 수 있어요.<br>스스로 감각을 캐치하는 힘이 있어서<br><strong>연습 방향</strong>만 잡히면 빠르게 올라가는 타입입니다.`;
  } else {
    targetResult = 'result1';
    estimatedMonths = 9;
    reasonHTML = `지금 상태에서는<br><strong>온라인 교정만으로도 충분히</strong> 변화를 만들 수 있어요.<br>스스로 감각을 캐치하는 힘이 있어서<br><strong>연습 방향</strong>만 잡히면 빠르게 올라가는 타입입니다.`;
  }
  
  const goalSong = answers['9'] || '당신의 목표곡';
  
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
      if (targetResult === 'result1') {
        stickyBtn.href = 'https://vo.la/발성의정석';
        stickyBtn.innerHTML = "'발성의 정석' 0원으로 바로 보기 👉";
      } else {
        stickyBtn.href = 'https://vo.la/w9LoHR';
        stickyBtn.innerHTML = "'매일 수업' 자세히 보기 👉";
      }
    }
    
    if (monthsEl) {
      monthsEl.textContent = estimatedMonths;
    }
    
    if (dynamicReasonText) {
      dynamicReasonText.innerHTML = reasonHTML;
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
