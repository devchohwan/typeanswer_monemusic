class CreateAnalyticsEvents < ActiveRecord::Migration[8.0]
  def change
    create_table :analytics_events do |t|
      t.string :session_id
      t.string :event_type
      t.json :event_data
      t.string :ip_address
      t.text :user_agent

      t.timestamps
    end
    
    add_index :analytics_events, :session_id
    add_index :analytics_events, :event_type
    add_index :analytics_events, :created_at
  end
end
