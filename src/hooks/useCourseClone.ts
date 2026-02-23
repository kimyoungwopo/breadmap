"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useCourseClone() {
  const [isCloning, setIsCloning] = useState(false);
  const router = useRouter();

  const cloneCourse = async (courseId: string) => {
    setIsCloning(true);
    try {
      const res = await fetch("/api/courses/clone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_course_id: courseId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("코스를 담았어요!");
        router.push(`/course/${data.id}`);
      } else if (res.status === 401) {
        toast.error("로그인이 필요해요");
      } else {
        toast.error("코스 담기에 실패했어요");
      }
    } catch {
      toast.error("네트워크 오류가 발생했어요");
    } finally {
      setIsCloning(false);
    }
  };

  return { cloneCourse, isCloning };
}
