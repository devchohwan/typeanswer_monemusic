require 'csv'

class AdminController < ApplicationController
  def dashboard
    @tab = params[:tab] || 'insights'
    @period = params[:period] || 'today'
    @start_date, @end_date = parse_date_range(@period, params[:start_date], params[:end_date])
    
    @question_titles = {
      1 => "시작 화면",
      2 => "테스트 소개",
      3 => "노래를 얼마나 자주 하나요?",
      4 => "지금 발성에서 어려운 점은?",
      5 => "지금 노래에 쓸 수 있는 최고음이 어느 정도인가요?",
      6 => "후렴구에서 소리가 얇아지거나 목이 조이는 문제가 있나요?",
      7 => "가성과 저음을 끊기지 않고 자연스럽게 이을 수 있나요?",
      8 => "당신의 목표곡 레벨은?",
      9 => "당신의 목표곡을 써주세요",
      10 => "새로운 기술을 배울 때, 실제로 더 빨리 늘었던 쪽은?"
    }
    
    @answer_labels = {
      3 => {
        'monthly' => '한 달에 한번 정도',
        'weekly' => '일주일에 한번 정도',
        'daily' => '매일'
      },
      4 => {
        'high-note' => '고음이 어렵다',
        'crack' => '목소리가 갈라진다',
        'breath' => '1절밖에 못 부르고 숨이 참',
        'low-note' => '저음이 어렵다'
      },
      5 => {
        'sol2' => '2옥타브 솔까지',
        'do3' => '3옥타브 도까지',
        're3' => '3옥타브 레까지',
        'mi3' => '3옥타브 미까지',
        'sol3' => '3옥타브 솔까지',
        'unknown' => '모름'
      },
      6 => {
        'yes' => '네',
        'no' => '아니오',
        'unknown' => '모르겠다'
      },
      7 => {
        'yes' => '네',
        'no' => '아니오',
        'unknown' => '모르겠다'
      },
      8 => {
        'monster' => '괴수의 꽃노래(바운디)',
        'betelgeuse' => '베텔기우스(유우리)',
        'tomorrow' => '내일의 밤하늘 초계반(orangestar)'
      },
      10 => {
        'self' => '혼자 반복하면서 감각을 잡았다',
        'guide' => '누가 옆에서 고쳐줄때 확 늘었다'
      }
    }
    
    case @tab
    when 'insights'
      load_insights_data
    when 'summary'
      load_summary_data
    when 'responses'
      load_responses_data
    end
  end

  def export_responses
    @start_date, @end_date = parse_date_range(params[:period], params[:start_date], params[:end_date])
    
    @question_titles = {
      1 => "시작 화면",
      2 => "테스트 소개",
      3 => "노래를 얼마나 자주 하나요?",
      4 => "지금 발성에서 어려운 점은?",
      5 => "지금 노래에 쓸 수 있는 최고음이 어느 정도인가요?",
      6 => "후렴구에서 소리가 얇아지거나 목이 조이는 문제가 있나요?",
      7 => "가성과 저음을 끊기지 않고 자연스럽게 이을 수 있나요?",
      8 => "당신의 목표곡 레벨은?",
      9 => "당신의 목표곡을 써주세요",
      10 => "새로운 기술을 배울 때, 실제로 더 빨리 늘었던 쪽은?"
    }
    
    @answer_labels = {
      3 => {
        'monthly' => '한 달에 한번 정도',
        'weekly' => '일주일에 한번 정도',
        'daily' => '매일'
      },
      4 => {
        'high-note' => '고음이 어렵다',
        'crack' => '목소리가 갈라진다',
        'breath' => '1절밖에 못 부르고 숨이 참',
        'low-note' => '저음이 어렵다'
      },
      5 => {
        'sol2' => '2옥타브 솔까지',
        'do3' => '3옥타브 도까지',
        're3' => '3옥타브 레까지',
        'mi3' => '3옥타브 미까지',
        'sol3' => '3옥타브 솔까지',
        'unknown' => '모름'
      },
      6 => {
        'yes' => '네',
        'no' => '아니오',
        'unknown' => '모르겠다'
      },
      7 => {
        'yes' => '네',
        'no' => '아니오',
        'unknown' => '모르겠다'
      },
      8 => {
        'monster' => '괴수의 꽃노래(바운디)',
        'betelgeuse' => '베텔기우스(유우리)',
        'tomorrow' => '내일의 밤하늘 초계반(orangestar)'
      },
      10 => {
        'self' => '혼자 반복하면서 감각을 잡았다',
        'guide' => '누가 옆에서 고쳐줄때 확 늘었다'
      }
    }
    
    @responses = AnalyticsEvent.get_completed_responses(@start_date, @end_date)
    
    respond_to do |format|
      format.csv do
        headers['Content-Disposition'] = "attachment; filename=\"quiz_responses_#{Date.today}.csv\""
        headers['Content-Type'] = 'text/csv; charset=utf-8'
      end
    end
  end

  private

  def load_insights_data
    @page_views = AnalyticsEvent.page_views.in_date_range(@start_date, @end_date).count
    @unique_visitors = AnalyticsEvent.unique_visitors(@start_date, @end_date)
    @start_clicks = AnalyticsEvent.start_clicks.in_date_range(@start_date, @end_date).distinct.count(:session_id)
    @result_views = AnalyticsEvent.result_views.in_date_range(@start_date, @end_date).distinct.count(:session_id)
    @result_clicks = AnalyticsEvent.result_clicks.in_date_range(@start_date, @end_date).distinct.count(:session_id)
    @reveal_clicks = AnalyticsEvent.reveal_clicks.in_date_range(@start_date, @end_date).count
    @sticky_cta_clicks = AnalyticsEvent.sticky_cta_clicks.in_date_range(@start_date, @end_date).count
    @conversion_rate = AnalyticsEvent.conversion_rate(@start_date, @end_date)
    @drop_off_by_question = AnalyticsEvent.drop_off_by_question(@start_date, @end_date)
    @avg_duration_by_question = AnalyticsEvent.average_duration_by_question(@start_date, @end_date)
  end

  def load_summary_data
    @answer_summary = AnalyticsEvent.get_answer_summary(@start_date, @end_date)
  end

  def load_responses_data
    @responses = AnalyticsEvent.get_completed_responses(@start_date, @end_date)
  end

  def parse_date_range(period, custom_start, custom_end)
    case period
    when 'today'
      [Date.today, Date.today]
    when 'week'
      [Date.today.beginning_of_week, Date.today.end_of_week]
    when 'month'
      [Date.today.beginning_of_month, Date.today.end_of_month]
    when 'custom'
      [Date.parse(custom_start), Date.parse(custom_end)] rescue [Date.today, Date.today]
    else
      [Date.today, Date.today]
    end
  end
end
