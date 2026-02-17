"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [bookmarks, setBookmarks] = useState<any[]>([]);

  // Get user on mount
  useEffect(() => {
    getUser();
  }, []);

  const getUser = async () => {
    const { data } = await supabase.auth.getUser();

    if (data.user) {
      setUser(data.user);
      fetchBookmarks(data.user.id);
    }
  };

  // Realtime subscription (PRODUCTION SAFE)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("bookmarks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchBookmarks(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBookmarks = async (userId: string) => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error) {
      setBookmarks(data || []);
    }
  };

  const addBookmark = async () => {
    if (!title || !url || !user) return;

    const { error } = await supabase.from("bookmarks").insert([
      {
        title,
        url,
        user_id: user.id,
      },
    ]);

    if (!error) {
      setTitle("");
      setUrl("");
    }
  };

  const deleteBookmark = async (id: string) => {
    if (!user) return;

    await supabase.from("bookmarks").delete().eq("id", id);
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: "google" });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setBookmarks([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
      {!user ? (
        <>
          <h1 className="text-2xl font-bold">Smart Bookmark App</h1>
          <button
            onClick={handleLogin}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Login with Google
          </button>
        </>
      ) : (
        <div className="w-full max-w-md flex flex-col gap-4">
          <h1 className="text-xl font-bold text-center">
            Welcome {user.email}
          </h1>

          <div className="flex flex-col gap-2">
            <input
              type="text"
              placeholder="Bookmark Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="p-2 border rounded"
            />
            <input
              type="text"
              placeholder="Bookmark URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="p-2 border rounded"
            />
            <button
              onClick={addBookmark}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Add Bookmark
            </button>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            {bookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="flex justify-between items-center border p-2 rounded"
              >
                <div>
                  <p className="font-semibold">{bookmark.title}</p>
                  <a
                    href={bookmark.url}
                    target="_blank"
                    className="text-blue-500 text-sm"
                  >
                    {bookmark.url}
                  </a>
                </div>
                <button
                  onClick={() => deleteBookmark(bookmark.id)}
                  className="text-red-500"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}