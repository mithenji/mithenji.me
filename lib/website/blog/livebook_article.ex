defmodule Website.Blog.LivebookArticle do
  @moduledoc """
  处理 Livebook 导出的 HTML 文章。

  工作流程:
  1. 在 Livebook 中编写交互式文档
  2. 导出为 HTML (File > Export > HTML)
  3. 将 HTML 文件放到 priv/resources/livebooks/YYYY/MM-DD-slug.html
  4. 本模块解析 HTML 并提取主体内容

  文件命名规则: MM-DD-slug.html (例如: 03-15-interactive-elixir.html)
  目录结构: priv/resources/livebooks/2024/03-15-interactive-elixir.html
  """

  @words_per_minute 200

  defstruct [
    :id,
    :slug,
    :title,
    :date,
    :description,
    :tags,
    :body,
    :read_minutes,
    :heading_links,
    :published,
    :type  # :livebook
  ]

  @doc """
  加载所有 Livebook 文章
  """
  def load_all do
    livebooks_path = Application.app_dir(:website, "priv/resources/livebooks")

    if File.dir?(livebooks_path) do
      livebooks_path
      |> Path.join("**/*.html")
      |> Path.wildcard()
      |> Enum.map(&parse_file/1)
      |> Enum.filter(& &1.published)
      |> Enum.sort_by(& &1.date, {:desc, Date})
    else
      []
    end
  end

  @doc """
  根据 slug 获取 Livebook 文章
  """
  def get_by_slug(slug) do
    load_all()
    |> Enum.find(&(&1.slug == slug))
  end

  defp parse_file(filepath) do
    # 从文件路径提取日期和 slug
    # 例如: priv/resources/livebooks/2024/03-15-interactive-elixir.html
    filename = Path.basename(filepath, ".html")
    year_dir = filepath |> Path.dirname() |> Path.basename()

    {date, slug} = parse_filename(year_dir, filename)

    # 读取并解析 HTML
    html_content = File.read!(filepath)
    {title, body, description} = extract_content(html_content)

    %__MODULE__{
      id: slug,
      slug: slug,
      title: title,
      date: date,
      description: description,
      tags: ["Livebook", "Interactive"],
      body: body,
      read_minutes: calculate_read_minutes(body),
      heading_links: parse_headings(body),
      published: true,
      type: :livebook
    }
  end

  defp parse_filename(year, filename) do
    # 文件名格式: MM-DD-slug
    case String.split(filename, "-", parts: 3) do
      [month, day, slug] ->
        date = Date.from_iso8601!("#{year}-#{month}-#{day}")
        {date, slug}

      _ ->
        # 如果格式不对，使用今天的日期
        {Date.utc_today(), filename}
    end
  end

  defp extract_content(html) do
    parsed = Floki.parse_document!(html)

    # 提取标题 (从 <title> 或 <h1>)
    title =
      case Floki.find(parsed, "title") do
        [{_, _, [text]} | _] -> text |> String.trim() |> String.replace(" - Livebook", "")
        _ -> extract_first_heading(parsed)
      end

    # 提取主体内容
    # Livebook 导出的 HTML 结构: <div class="notebook">...</div>
    body =
      case Floki.find(parsed, ".notebook") do
        [notebook | _] -> Floki.raw_html(notebook)
        _ ->
          # 备选: 提取 <main> 或 <body> 内容
          case Floki.find(parsed, "main") do
            [main | _] -> Floki.raw_html(main)
            _ ->
              case Floki.find(parsed, "body") do
                [{_, _, children} | _] -> Floki.raw_html(children)
                _ -> ""
              end
          end
      end

    # 提取描述 (第一段文字)
    description =
      parsed
      |> Floki.find("p")
      |> List.first()
      |> case do
        nil -> ""
        elem -> Floki.text(elem) |> String.slice(0, 200)
      end

    {title, body, description}
  end

  defp extract_first_heading(parsed) do
    case Floki.find(parsed, "h1, h2") do
      [heading | _] -> Floki.text(heading)
      _ -> "Untitled"
    end
  end

  defp calculate_read_minutes(html) do
    word_count =
      Floki.parse_fragment!(html)
      |> Floki.text()
      |> String.split(~r/\s+/)
      |> Enum.count()

    case div(word_count, @words_per_minute) do
      0 -> 1
      n -> n
    end
  end

  defp parse_headings(body) do
    body
    |> Floki.parse_fragment!()
    |> Enum.reduce([], fn
      {"h2", _attrs, _children} = el, acc ->
        acc ++ [%{label: Floki.text(el), href: nil, childs: []}]

      {"h3", _attrs, _children} = el, acc ->
        if acc == [] do
          acc
        else
          List.update_at(acc, -1, fn %{childs: subs} = h2 ->
            %{h2 | childs: subs ++ [%{label: Floki.text(el), href: nil, childs: []}]}
          end)
        end

      _other, acc ->
        acc
    end)
  end
end
