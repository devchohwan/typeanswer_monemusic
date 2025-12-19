class AnalyticsEvent < ApplicationRecord
  validates :session_id, presence: true
  validates :event_type, presence: true

  scope :page_views, -> { where(event_type: 'page_view') }
  scope :start_clicks, -> { where(event_type: 'start_click') }
  scope :question_views, -> { where(event_type: 'question_view') }
  scope :question_answers, -> { where(event_type: 'question_answer') }
  scope :question_durations, -> { where(event_type: 'question_duration') }
  scope :result_views, -> { where(event_type: 'result_view') }
  scope :result_clicks, -> { where(event_type: 'result_click') }
  scope :reveal_clicks, -> { where(event_type: 'reveal_click') }
  scope :sticky_cta_clicks, -> { where(event_type: 'sticky_cta_click') }
  scope :reason_view_clicks, -> { where(event_type: 'reason_view_click') }
  scope :change_view_clicks, -> { where(event_type: 'change_view_click') }
  scope :course_cta_clicks, -> { where(event_type: 'course_cta_click') }
  
  scope :in_date_range, ->(start_date, end_date) {
    where(created_at: start_date.beginning_of_day..end_date.end_of_day)
  }

  def self.unique_visitors(start_date, end_date)
    page_views
      .in_date_range(start_date, end_date)
      .distinct
      .count(:session_id)
  end

  def self.conversion_rate(start_date, end_date)
    started = in_date_range(start_date, end_date).start_clicks.distinct.count(:session_id)
    completed = in_date_range(start_date, end_date).result_views.distinct.count(:session_id)
    return 0 if started.zero?
    ((completed.to_f / started) * 100).round(2)
  end

  def self.drop_off_by_question(start_date, end_date)
    questions = (1..8).to_a
    results = {}
    
    questions.each do |q|
      viewed = in_date_range(start_date, end_date)
        .question_views
        .where("json_extract(event_data, '$.question') = ?", q)
        .distinct.count(:session_id)
      
      next_viewed = if q < 8
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

  def self.average_duration_by_question(start_date, end_date)
    results = {}
    
    (1..8).each do |q|
      durations = in_date_range(start_date, end_date)
        .question_durations
        .where("json_extract(event_data, '$.question') = ?", q)
        .pluck(Arel.sql("json_extract(event_data, '$.duration')"))
        .map(&:to_f)
      
      if durations.any?
        avg = (durations.sum / durations.size).round(1)
        results[q] = { average: avg, count: durations.size }
      else
        results[q] = { average: 0, count: 0 }
      end
    end
    
    results
  end

  def self.get_answer_summary(start_date, end_date)
    summary = {}
    
    (2..8).each do |q|
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
    result_view_events = in_date_range(start_date, end_date)
      .result_views
      .order(created_at: :desc)
    
    responses = []
    
    result_view_events.each do |result_event|
      session_id = result_event.session_id
      completed_at = result_event.created_at
      
      answers = {}
      has_answers = false
      
      (2..8).each do |q|
        event = where(session_id: session_id, event_type: 'question_answer')
          .where("json_extract(event_data, '$.question') = ?", q)
          .where('created_at <= ?', completed_at)
          .order(created_at: :desc)
          .first
        
        answer = event&.event_data&.dig('answer')
        answers[q] = answer
        has_answers = true if answer.present?
      end
      
      next unless has_answers
      
      responses << {
        session_id: session_id,
        completed_at: completed_at,
        answers: answers
      }
    end
    
    responses
  end
end
