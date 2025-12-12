require "test_helper"

class AnalyticsControllerTest < ActionDispatch::IntegrationTest
  test "should get track" do
    get analytics_track_url
    assert_response :success
  end
end
