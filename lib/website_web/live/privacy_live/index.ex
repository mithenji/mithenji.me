defmodule WebsiteWeb.PrivacyLive.Index do
  use WebsiteWeb, :live_view

  @impl Phoenix.LiveView
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :page_title, "Privacy Policy - Mithen Ji")}
  end
end
