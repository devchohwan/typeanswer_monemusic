class AnalyticsEvent < ApplicationRecord
  validates :session_id, presence: true
  validates :event_type, presence: true

  scope :page_views, -> { where(event_type: 'page_view') }
  scope :start_clicks, -> { where(event_type: 'start_click') }
  scope :question_views, -> { where(event_type: 'question_view') }
  scope :question_answers, -> { where(event_type: 'question_answer') }
  scope :result_views, -> { where(event_type: 'result_view') }
  scope :result_clicks, -> { where(event_type: 'result_click') }
  
  scope :in_date_range, ->(start_date, end_date) {
    where(created_at: start_date.beginning_of_day..end_date.end_of_day)
  }

  def self.unique_visitors(start_date, end_date)
    in_date_range(start_date, end_date).distinct.count(:session_id)
  end

  def self.conversion_rate(start_date, end_date)
    started = in_date_range(start_date, end_date).start_clicks.distinct.count(:session_id)
    completed = in_date_range(start_date, end_date).result_views.distinct.count(:session_id)
    return 0 if started.zero?
    ((completed.to_f / started) * 100).round(2)
  end

  def self.drop_off_by_question(start_date, end_date)
    questions = (1..10).to_a
    results = {}
    
    questions.each do |q|
      viewed = in_date_range(start_date, end_date)
        .question_views
        .where("json_extract(event_data, '$.question') = ?", q)
        .distinct.count(:session_id)
      
      next_viewed = if q < 10
        in_date_range(start_date, end_date)
          .question_views
          .where("json_extract(event_data, '$.question') = ?", q + 1)
          .distinct.count(:session_id)
      else
        in_date_range(start_date, end_date)
          .result_views.distinct.count(:session_id)
      end
      
      drop_off_rate = viewed > 0 ? [((viewed - next_viewed).to_f / viewed) * 100, 0].max.round(2) : 0
      results[q] = { viewed: viewed, drop_off: drop_off_rate }
    end
    
    results
  end

  def self.get_answer_summary(start_date, end_date)
    summary = {}
    
    (3..10).each do |q|
      answers = in_date_range(start_date, end_date)
        .question_answers
        .where("json_extract(event_data, '$.question') = ?", q)
        .group_by(&:session_id)
      
      answer_counts = {}
      answers.each do |session_id, events|
        last_event = events.max_by(&:created_at)
        answer_value = last_event.event_data['answer']
        answer_counts[answer_value] ||= 0
        answer_counts[answer_value] += 1
      end
      
      total = answer_counts.values.sum
      summary[q] = answer_counts.map do |answer, count|
        percentage = total > 0 ? ((count.to_f / total) * 100).round(2) : 0
        { answer: answer, count: count, percentage: percentage }
      end.sort_by { |a| -a[:count] }
    end
    
    summary
  end

  def self.get_completed_responses(start_date, end_date)
    completed_sessions = in_date_range(start_date, end_date)
      .result_views
      .pluck(:session_id, :created_at)
      .to_h
    
    responses = []
    
    completed_sessions.each do |session_id, completed_at|
      answers = {}
      
      (3..10).each do |q|
        event = where(session_id: session_id, event_type: 'question_answer')
          .where("json_extract(event_data, '$.question') = ?", q)
          .first
        
        answers[q] = event&.event_data&.dig('answer')
      end
      
      responses << {
        session_id: session_id,
        completed_at: completed_at,
        answers: answers
      }
    end
    
    responses.sort_by { |r| -r[:completed_at].to_i }
  end
end
