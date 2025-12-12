class AnalyticsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: [:track]

  def track
    session_id = session.id.to_s
    
    AnalyticsEvent.create!(
      session_id: session_id,
      event_type: params[:event_type],
      event_data: params[:event_data] || {},
      ip_address: request.remote_ip,
      user_agent: request.user_agent
    )
    
    head :ok
  rescue => e
    Rails.logger.error "Analytics tracking error: #{e.message}"
    head :ok
  end
end
