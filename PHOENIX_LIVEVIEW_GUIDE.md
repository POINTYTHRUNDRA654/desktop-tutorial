# Phoenix LiveView Integration Guide

## Overview

Phoenix LiveView enables building rich, real-time user experiences with server-rendered HTML. This guide shows how to integrate LiveView with Mossy for real-time monitoring, dashboards, and collaborative features.

## What is Phoenix LiveView?

**Technology Stack:**
- **Elixir** - Functional programming language
- **Phoenix** - Web framework
- **LiveView** - Real-time UI library
- **WebSocket** - Live communication protocol

**Key Features:**
- Real-time updates without page reloads
- Server manages all UI state
- Automatic recovery from disconnections
- Built-in form validation and file uploads
- Live navigation without full page loads
- No JavaScript build step required

## Why Phoenix LiveView for Mossy?

### Benefits

**1. Real-Time Monitoring:**
- Live tool status updates
- Build progress tracking
- Neural Link activity streaming
- System resource monitoring

**2. Collaborative Features:**
- Multi-user mod editing
- Team collaboration tools
- Live chat/assistance
- Shared project views

**3. Low-Latency Interactions:**
- Instant UI updates
- Server-side state management
- Efficient WebSocket communication
- Automatic reconnection

**4. Simplified Development:**
- No complex JavaScript frameworks
- Server-side rendering
- Minimal client-side code
- Built-in state management

## Use Cases for Fallout 4 Modding

### 1. Real-Time Tool Monitor

Track active modding tools as they're detected by Neural Link:

```elixir
defmodule MossyWeb.ToolMonitorLive do
  use MossyWeb, :live_view
  
  def mount(_params, _session, socket) do
    if connected?(socket) do
      # Poll Neural Link every second
      :timer.send_interval(1000, self(), :update_tools)
    end
    
    {:ok, assign(socket,
      blender_active: false,
      xedit_active: false,
      ck_active: false,
      mo2_active: false,
      tools: []
    )}
  end
  
  def handle_info(:update_tools, socket) do
    # Query Mossy Desktop Bridge
    tools = Mossy.DesktopBridge.get_active_tools()
    
    {:noreply, assign(socket,
      tools: tools,
      blender_active: "Blender" in tools,
      xedit_active: "xEdit" in tools,
      ck_active: "CreationKit" in tools,
      mo2_active: "MO2" in tools
    )}
  end
  
  def render(assigns) do
    ~H"""
    <div class="tool-monitor">
      <h1>Active Modding Tools</h1>
      
      <div class="tool-grid">
        <div class={"tool-card #{if @blender_active, do: "active", else: "inactive"}"}>
          <span class="tool-icon">🎨</span>
          <h3>Blender</h3>
          <span class="status"><%= if @blender_active, do: "Running", else: "Inactive" %></span>
        </div>
        
        <div class={"tool-card #{if @xedit_active, do: "active", else: "inactive"}"}>
          <span class="tool-icon">📊</span>
          <h3>xEdit</h3>
          <span class="status"><%= if @xedit_active, do: "Running", else: "Inactive" %></span>
        </div>
        
        <div class={"tool-card #{if @ck_active, do: "active", else: "inactive"}"}>
          <span class="tool-icon">🔧</span>
          <h3>Creation Kit</h3>
          <span class="status"><%= if @ck_active, do: "Running", else: "Inactive" %></span>
        </div>
        
        <div class={"tool-card #{if @mo2_active, do: "active", else: "inactive"}"}>
          <span class="tool-icon">📦</span>
          <h3>Mod Organizer 2</h3>
          <span class="status"><%= if @mo2_active, do: "Running", else: "Inactive" %></span>
        </div>
      </div>
      
      <div class="activity-feed">
        <h2>Recent Activity</h2>
        <div :for={tool <- @tools} class="activity-item">
          <%= tool %> detected at <%= Calendar.strftime(DateTime.utc_now(), "%H:%M:%S") %>
        </div>
      </div>
    </div>
    """
  end
end
```

### 2. Live Build Progress

Stream compilation progress in real-time:

```elixir
defmodule MossyWeb.BuildLive do
  use MossyWeb, :live_view
  
  def mount(_params, _session, socket) do
    # Subscribe to build events
    if connected?(socket) do
      Phoenix.PubSub.subscribe(Mossy.PubSub, "builds")
    end
    
    {:ok, assign(socket,
      current_build: nil,
      progress: 0,
      status: "idle",
      logs: [],
      errors: [],
      warnings: []
    )}
  end
  
  def handle_info({:build_started, build_id}, socket) do
    {:noreply, assign(socket,
      current_build: build_id,
      progress: 0,
      status: "building",
      logs: []
    )}
  end
  
  def handle_info({:build_progress, percent, message}, socket) do
    logs = [message | socket.assigns.logs] |> Enum.take(50)
    
    {:noreply, assign(socket,
      progress: percent,
      logs: logs
    )}
  end
  
  def handle_info({:build_complete, result}, socket) do
    {:noreply, assign(socket,
      status: "complete",
      progress: 100
    )}
  end
  
  def handle_info({:build_error, error}, socket) do
    errors = [error | socket.assigns.errors]
    
    {:noreply, assign(socket,
      status: "error",
      errors: errors
    )}
  end
  
  def render(assigns) do
    ~H"""
    <div class="build-dashboard">
      <h1>Build Progress</h1>
      
      <div class="build-status">
        <span class={"status-badge #{@status}"}>
          <%= String.upcase(@status) %>
        </span>
      </div>
      
      <div class="progress-bar">
        <div class="progress-fill" style={"width: #{@progress}%"}></div>
        <span class="progress-text"><%= @progress %>%</span>
      </div>
      
      <div class="build-logs">
        <h2>Build Log</h2>
        <div class="log-container">
          <div :for={log <- @logs} class="log-entry">
            <%= log %>
          </div>
        </div>
      </div>
      
      <div :if={length(@errors) > 0} class="errors">
        <h2>Errors</h2>
        <div :for={error <- @errors} class="error-item">
          ❌ <%= error %>
        </div>
      </div>
      
      <div :if={length(@warnings) > 0} class="warnings">
        <h2>Warnings</h2>
        <div :for={warning <- @warnings} class="warning-item">
          ⚠️ <%= warning %>
        </div>
      </div>
    </div>
    """
  end
end
```

### 3. Collaborative Mod Editor

Enable multiple modders to work together:

```elixir
defmodule MossyWeb.CollabEditorLive do
  use MossyWeb, :live_view
  
  def mount(%{"project_id" => project_id}, _session, socket) do
    if connected?(socket) do
      # Subscribe to project updates
      Phoenix.PubSub.subscribe(Mossy.PubSub, "project:#{project_id}")
      
      # Announce presence
      Phoenix.PubSub.broadcast(
        Mossy.PubSub,
        "project:#{project_id}",
        {:user_joined, socket.assigns.current_user}
      )
    end
    
    project = Mossy.Projects.get_project!(project_id)
    
    {:ok, assign(socket,
      project: project,
      content: project.content,
      users: [],
      cursor_positions: %{},
      changes: []
    )}
  end
  
  def handle_event("content_changed", %{"content" => content}, socket) do
    # Broadcast change to other users
    Phoenix.PubSub.broadcast(
      Mossy.PubSub,
      "project:#{socket.assigns.project.id}",
      {:content_update, socket.assigns.current_user, content}
    )
    
    {:noreply, assign(socket, content: content)}
  end
  
  def handle_event("cursor_moved", %{"position" => position}, socket) do
    # Broadcast cursor position
    Phoenix.PubSub.broadcast(
      Mossy.PubSub,
      "project:#{socket.assigns.project.id}",
      {:cursor_move, socket.assigns.current_user, position}
    )
    
    {:noreply, socket}
  end
  
  def handle_info({:content_update, user, content}, socket) do
    # Skip if it's from current user
    if user.id == socket.assigns.current_user.id do
      {:noreply, socket}
    else
      {:noreply, assign(socket, content: content)}
    end
  end
  
  def handle_info({:cursor_move, user, position}, socket) do
    cursor_positions = Map.put(
      socket.assigns.cursor_positions,
      user.id,
      position
    )
    
    {:noreply, assign(socket, cursor_positions: cursor_positions)}
  end
  
  def handle_info({:user_joined, user}, socket) do
    users = [user | socket.assigns.users] |> Enum.uniq_by(& &1.id)
    {:noreply, assign(socket, users: users)}
  end
  
  def render(assigns) do
    ~H"""
    <div class="collab-editor">
      <div class="editor-header">
        <h1><%= @project.name %></h1>
        <div class="active-users">
          <span :for={user <- @users} class="user-badge">
            <%= user.name %>
          </span>
        </div>
      </div>
      
      <div class="editor-container">
        <textarea
          phx-change="content_changed"
          phx-hook="CursorTracking"
          class="editor-content"
        ><%= @content %></textarea>
        
        <div :for={{user_id, position} <- @cursor_positions} class="remote-cursor" style={"top: #{position.y}px; left: #{position.x}px"}>
          <%= get_user_name(user_id) %>
        </div>
      </div>
      
      <div class="changes-panel">
        <h2>Recent Changes</h2>
        <div :for={change <- @changes} class="change-item">
          <%= change.user %> - <%= change.description %>
        </div>
      </div>
    </div>
    """
  end
end
```

### 4. Asset Preview Dashboard

Live preview of textures and models:

```elixir
defmodule MossyWeb.AssetPreviewLive do
  use MossyWeb, :live_view
  
  def mount(_params, _session, socket) do
    if connected?(socket) do
      Phoenix.PubSub.subscribe(Mossy.PubSub, "assets")
    end
    
    {:ok, assign(socket,
      current_asset: nil,
      preview_type: "texture",
      assets: Mossy.Assets.list_recent(),
      generations: []
    )}
  end
  
  def handle_event("select_asset", %{"id" => id}, socket) do
    asset = Mossy.Assets.get_asset!(id)
    {:noreply, assign(socket, current_asset: asset)}
  end
  
  def handle_event("generate_preview", %{"prompt" => prompt}, socket) do
    # Trigger AI generation (Cosmos, ComfyUI, etc.)
    Phoenix.PubSub.broadcast(
      Mossy.PubSub,
      "assets",
      {:generate_request, prompt, self()}
    )
    
    {:noreply, socket}
  end
  
  def handle_info({:generation_progress, percent}, socket) do
    {:noreply, push_event(socket, "update_progress", %{percent: percent})}
  end
  
  def handle_info({:generation_complete, asset_url}, socket) do
    generations = [asset_url | socket.assigns.generations]
    {:noreply, assign(socket, generations: generations)}
  end
  
  def render(assigns) do
    ~H"""
    <div class="asset-preview">
      <div class="asset-list">
        <h2>Recent Assets</h2>
        <div :for={asset <- @assets} class="asset-item" phx-click="select_asset" phx-value-id={asset.id}>
          <img src={asset.thumbnail_url} />
          <span><%= asset.name %></span>
        </div>
      </div>
      
      <div class="preview-area">
        <div :if={@current_asset} class="current-preview">
          <h1><%= @current_asset.name %></h1>
          <img src={@current_asset.url} class="preview-image" />
        </div>
        
        <div class="generation-controls">
          <form phx-submit="generate_preview">
            <input type="text" name="prompt" placeholder="Enter generation prompt..." />
            <button type="submit">Generate Variation</button>
          </form>
        </div>
        
        <div class="generated-previews">
          <h3>Generated Variations</h3>
          <div class="preview-grid">
            <img :for={gen <- @generations} src={gen} class="generated-image" />
          </div>
        </div>
      </div>
    </div>
    """
  end
end
```

## Architecture Options

### Option 1: Standalone Web Dashboard

Run Phoenix LiveView as a separate web service:

```
Mossy Desktop (Electron)
    ↓ HTTP/WebSocket API
Phoenix LiveView Server (port 4000)
    ↓ WebSocket
Web Browser Dashboard
```

**Pros:**
- Can access from any device
- Multiple users can connect
- Scales independently
- Browser-based (no install)

**Cons:**
- Requires separate server
- Additional setup
- Network dependency

### Option 2: Embedded Server

Embed Phoenix server in Electron:

```
Mossy Desktop
    ├─ Electron Main Process
    ├─ React Renderer (existing UI)
    └─ Embedded Phoenix Server
        └─ LiveView for specific features
```

**Pros:**
- Single application
- No external dependencies
- Simpler deployment

**Cons:**
- Requires Elixir runtime
- Larger app size
- More complex build

### Option 3: Hybrid Architecture

Use Phoenix for real-time features only:

```
Mossy Desktop (main UI)
    ↓
Phoenix Service (monitoring/collaboration)
    ↓
WebView/Browser for LiveView features
```

**Pros:**
- Best of both worlds
- Use React for main UI
- Use LiveView for real-time

**Cons:**
- More complex
- Multiple tech stacks

## Setup Instructions

### 1. Install Elixir

**macOS:**
```bash
brew install elixir
```

**Windows:**
```bash
choco install elixir
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install elixir

# Arch
sudo pacman -S elixir
```

### 2. Install Phoenix

```bash
mix local.hex --force
mix archive.install hex phx_new --force
```

### 3. Create Phoenix Project

```bash
# Create new Phoenix project with LiveView
mix phx.new mossy_web --live

cd mossy_web

# Install dependencies
mix deps.get

# Create database (if using Ecto)
mix ecto.create

# Start server
mix phx.server
```

### 4. Configure Desktop Bridge

Create a GenServer to connect Mossy Desktop to Phoenix:

```elixir
# lib/mossy_web/desktop_bridge.ex
defmodule MossyWeb.DesktopBridge do
  use GenServer
  require Logger
  
  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end
  
  def init(state) do
    # Connect to Mossy Desktop Bridge WebSocket
    case connect_to_desktop() do
      {:ok, conn} ->
        {:ok, Map.put(state, :conn, conn)}
      {:error, reason} ->
        Logger.error("Failed to connect to Mossy Desktop: #{reason}")
        # Retry after 5 seconds
        Process.send_after(self(), :retry_connect, 5000)
        {:ok, state}
    end
  end
  
  def handle_info(:retry_connect, state) do
    case connect_to_desktop() do
      {:ok, conn} ->
        {:noreply, Map.put(state, :conn, conn)}
      {:error, _} ->
        Process.send_after(self(), :retry_connect, 5000)
        {:noreply, state}
    end
  end
  
  def handle_info({:gun_ws, _conn, _stream, {:text, data}}, state) do
    # Parse incoming message from Mossy Desktop
    case Jason.decode(data) do
      {:ok, %{"type" => "tool_detected", "tool" => tool}} ->
        # Broadcast to LiveView subscribers
        Phoenix.PubSub.broadcast(
          MossyWeb.PubSub,
          "neural_link",
          {:tool_detected, tool}
        )
        
      {:ok, %{"type" => "build_progress", "percent" => percent}} ->
        Phoenix.PubSub.broadcast(
          MossyWeb.PubSub,
          "builds",
          {:build_progress, percent}
        )
        
      _ ->
        :ok
    end
    
    {:noreply, state}
  end
  
  defp connect_to_desktop do
    # Connect to Mossy Desktop Bridge (port 54321)
    with {:ok, conn} <- :gun.open('localhost', 54321),
         {:ok, :http} <- :gun.await_up(conn),
         stream <- :gun.ws_upgrade(conn, "/bridge") do
      {:ok, conn}
    else
      error -> {:error, error}
    end
  end
end
```

### 5. Add to Application Supervisor

```elixir
# lib/mossy_web/application.ex
def start(_type, _args) do
  children = [
    MossyWeb.PubSub,
    MossyWeb.Endpoint,
    MossyWeb.DesktopBridge  # Add this line
  ]
  
  opts = [strategy: :one_for_one, name: MossyWeb.Supervisor]
  Supervisor.start_link(children, opts)
end
```

## Deployment

### Development

```bash
mix phx.server
# Visit http://localhost:4000
```

### Production

```bash
# Build release
MIX_ENV=prod mix release

# Start release
_build/prod/rel/mossy_web/bin/mossy_web start

# Or run in foreground
_build/prod/rel/mossy_web/bin/mossy_web start_iex
```

### Docker

```dockerfile
FROM elixir:1.14-alpine

WORKDIR /app

# Install dependencies
RUN mix local.hex --force && \
    mix local.rebar --force

# Copy files
COPY mix.exs mix.lock ./
RUN mix deps.get

COPY . .

# Compile
RUN MIX_ENV=prod mix compile

# Build release
RUN MIX_ENV=prod mix release

CMD ["_build/prod/rel/mossy_web/bin/mossy_web", "start"]
```

## Performance Optimization

### 1. Use Temporary Assigns

```elixir
def mount(_params, _session, socket) do
  socket = assign(socket, :large_data, some_data)
  socket = socket |> assign(:temporary_assigns, [:large_data])
  {:ok, socket}
end
```

### 2. Debounce Events

```javascript
// In app.js
let Hooks = {}

Hooks.Debounced = {
  mounted() {
    this.el.addEventListener("input", e => {
      clearTimeout(this.timeout)
      this.timeout = setTimeout(() => {
        this.pushEvent("search", {query: e.target.value})
      }, 500)
    })
  }
}
```

### 3. Use Streams for Large Lists

```elixir
def mount(_params, _session, socket) do
  {:ok, stream(socket, :assets, Mossy.Assets.list())}
end

def handle_info({:new_asset, asset}, socket) do
  {:noreply, stream_insert(socket, :assets, asset, at: 0)}
end
```

## Testing

```elixir
# test/mossy_web/live/tool_monitor_live_test.exs
defmodule MossyWeb.ToolMonitorLiveTest do
  use MossyWeb.ConnCase
  import Phoenix.LiveViewTest
  
  test "displays active tools", %{conn: conn} do
    {:ok, view, html} = live(conn, "/monitor")
    
    assert html =~ "Active Modding Tools"
    assert has_element?(view, ".tool-card", "Blender")
  end
  
  test "updates when tool detected", %{conn: conn} do
    {:ok, view, _html} = live(conn, "/monitor")
    
    # Simulate tool detection
    Phoenix.PubSub.broadcast(
      MossyWeb.PubSub,
      "neural_link",
      {:tool_detected, "Blender"}
    )
    
    assert has_element?(view, ".tool-card.active", "Blender")
  end
end
```

## Troubleshooting

### Connection Issues

**Problem:** Phoenix can't connect to Mossy Desktop

**Solution:**
1. Ensure Mossy Desktop is running
2. Check Desktop Bridge is on port 54321
3. Check firewall settings
4. Look for connection errors in logs

### Performance Issues

**Problem:** Slow updates in LiveView

**Solution:**
1. Use temporary assigns for large data
2. Implement debouncing for frequent events
3. Use streams instead of assigns for lists
4. Check network latency

### State Synchronization

**Problem:** State out of sync between clients

**Solution:**
1. Use PubSub for broadcasts
2. Implement proper conflict resolution
3. Add timestamps to changes
4. Use Phoenix Presence for user tracking

## Further Resources

- [Phoenix LiveView Documentation](https://hexdocs.pm/phoenix_live_view/)
- [Phoenix Framework Guide](https://hexdocs.pm/phoenix/)
- [Elixir Getting Started](https://elixir-lang.org/getting-started/)
- [LiveView Patterns](https://fly.io/phoenix-files/liveview-patterns/)

## Conclusion

Phoenix LiveView provides a powerful way to add real-time features to Mossy without complex JavaScript frameworks. Use it for monitoring dashboards, collaborative features, and live updates while keeping the main Electron app for the desktop experience.
