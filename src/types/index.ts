export interface User {
  id: string;
  kakao_id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Bakery {
  id: string;
  kakao_place_id: string | null;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string | null;
  image_url: string | null;
  avg_rating: number;
  checkin_count: number;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  bakery_id: string;
  visited_at: string;
  created_at: string;
  bakery?: Bakery;
  breads?: Bread[];
}

export interface Bread {
  id: string;
  checkin_id: string;
  name: string;
  photo_url: string | null;
  rating: number;
  memo: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  title: string;
  region: string | null;
  total_distance_m: number | null;
  total_duration_s: number | null;
  created_at: string;
  stops?: CourseStop[];
}

export interface CourseStop {
  id: string;
  course_id: string;
  bakery_id: string;
  stop_order: number;
  distance_to_next_m: number | null;
  duration_to_next_s: number | null;
  bakery?: Bakery;
}

export interface Place {
  id: string;
  lat: number;
  lng: number;
  name: string;
}

export interface OptimizedRoute {
  order: Place[];
  totalDistance: number;
}
