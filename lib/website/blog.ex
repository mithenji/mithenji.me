defmodule Website.Blog do
  @moduledoc """
  The blog context.

  支持两种文章类型:
  1. 普通 Markdown 文章 (.md) - 使用 NimblePublisher + MDEx
  2. Livebook 交互式文章 (.html) - 从 Livebook 导出的 HTML
  """
  use NimblePublisher,
    build: Website.Blog.Article,
    from: Application.app_dir(:website, "priv/resources/articles/**/*.md"),
    as: :articles,
    html_converter: Website.MarkdownConverter

  alias Website.Blog.LivebookArticle

  @articles Enum.filter(@articles, & &1.published) |> Enum.sort_by(& &1.date, {:desc, Date})

  @doc """
  Returns all articles (Markdown + Livebook).
  """
  def all_articles do
    livebook_articles = LivebookArticle.load_all()

    (@articles ++ livebook_articles)
    |> Enum.sort_by(& &1.date, {:desc, Date})
  end

  @doc """
  Returns only markdown articles.
  """
  def markdown_articles, do: @articles

  @doc """
  Returns only livebook articles.
  """
  def livebook_articles, do: LivebookArticle.load_all()

  @doc """
  Returns all tags.
  """
  def all_tags do
    all_articles()
    |> Enum.flat_map(& &1.tags)
    |> Enum.uniq()
    |> Enum.sort()
  end

  @doc """
  Returns the most recent articles.
  """
  def recent_articles(count \\ 3), do: Enum.take(all_articles(), count)

  @doc """
  List articles by tag.
  """
  def articles_by_tag(tag) when is_nil(tag), do: all_articles()

  def articles_by_tag(tag) do
    Enum.filter(all_articles(), fn article ->
      Enum.any?(article.tags, fn t -> String.downcase(t) == String.downcase(tag) end)
    end)
  end

  @doc """
  Returns an article by its slug.
  Searches both markdown and livebook articles.
  """
  def get_article_by_slug(slug) do
    # 先在 markdown 文章中查找
    case Enum.find(@articles, &(&1.slug == slug)) do
      nil ->
        # 再在 livebook 文章中查找
        LivebookArticle.get_by_slug(slug)

      article ->
        article
    end
  end

  @doc """
  Check if an article is a livebook article.
  """
  def livebook_article?(%LivebookArticle{}), do: true
  def livebook_article?(_), do: false
end
