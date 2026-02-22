-- 빵지순례 초기 스키마
-- PostGIS 확장 활성화 (Supabase에서 기본 제공)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- TABLES
-- ============================================

-- 사용자
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kakao_id      TEXT UNIQUE NOT NULL,
  nickname      TEXT NOT NULL,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 빵집
CREATE TABLE bakeries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kakao_place_id  TEXT UNIQUE,
  name            TEXT NOT NULL,
  address         TEXT NOT NULL,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  category        TEXT,
  image_url       TEXT,
  avg_rating      NUMERIC(2,1) DEFAULT 0,
  checkin_count   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 체크인
CREATE TABLE checkins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) NOT NULL,
  bakery_id     UUID REFERENCES bakeries(id) NOT NULL,
  visited_at    TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 빵 기록
CREATE TABLE breads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_id    UUID REFERENCES checkins(id) ON DELETE CASCADE NOT NULL,
  name          TEXT NOT NULL,
  photo_url     TEXT,
  rating        SMALLINT CHECK (rating BETWEEN 1 AND 5),
  memo          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 코스
CREATE TABLE courses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) NOT NULL,
  title             TEXT NOT NULL,
  region            TEXT,
  total_distance_m  INTEGER,
  total_duration_s  INTEGER,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- 코스 정류장
CREATE TABLE course_stops (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id             UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  bakery_id             UUID REFERENCES bakeries(id) NOT NULL,
  stop_order            SMALLINT NOT NULL,
  distance_to_next_m    INTEGER,
  duration_to_next_s    INTEGER
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_bakeries_location ON bakeries USING gist (
  ST_SetSRID(ST_MakePoint(lng, lat), 4326)
);
CREATE INDEX idx_checkins_user ON checkins(user_id);
CREATE INDEX idx_checkins_bakery ON checkins(bakery_id);
CREATE INDEX idx_breads_checkin ON breads(checkin_id);
CREATE INDEX idx_courses_user ON courses(user_id);
CREATE INDEX idx_course_stops_course ON course_stops(course_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read profiles"
  ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE USING (auth.uid() = id);

ALTER TABLE bakeries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bakeries"
  ON bakeries FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert bakeries"
  ON bakeries FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read checkins"
  ON checkins FOR SELECT USING (true);
CREATE POLICY "Users can create own checkins"
  ON checkins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins"
  ON checkins FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE breads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read breads"
  ON breads FOR SELECT USING (true);
CREATE POLICY "Users can create breads for own checkins"
  ON breads FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM checkins
      WHERE checkins.id = checkin_id AND checkins.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own breads"
  ON breads FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM checkins
      WHERE checkins.id = checkin_id AND checkins.user_id = auth.uid()
    )
  );

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read courses"
  ON courses FOR SELECT USING (true);
CREATE POLICY "Users can create own courses"
  ON courses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses"
  ON courses FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE course_stops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read course_stops"
  ON course_stops FOR SELECT USING (true);
CREATE POLICY "Users can manage stops for own courses"
  ON course_stops FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id AND courses.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete stops for own courses"
  ON course_stops FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = course_id AND courses.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- 체크인 시 빵집 통계 자동 업데이트
CREATE OR REPLACE FUNCTION update_bakery_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE bakeries SET
    checkin_count = (
      SELECT COUNT(*) FROM checkins WHERE bakery_id = NEW.bakery_id
    ),
    avg_rating = (
      SELECT COALESCE(AVG(b.rating), 0)
      FROM breads b
      JOIN checkins c ON c.id = b.checkin_id
      WHERE c.bakery_id = NEW.bakery_id
    )
  WHERE id = NEW.bakery_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_checkin_insert
  AFTER INSERT ON checkins
  FOR EACH ROW
  EXECUTE FUNCTION update_bakery_stats();

-- 빵 기록 시 빵집 평균 별점 업데이트
CREATE OR REPLACE FUNCTION update_bakery_rating_on_bread()
RETURNS TRIGGER AS $$
DECLARE
  v_bakery_id UUID;
BEGIN
  SELECT bakery_id INTO v_bakery_id
  FROM checkins WHERE id = NEW.checkin_id;

  UPDATE bakeries SET
    avg_rating = (
      SELECT COALESCE(AVG(b.rating), 0)
      FROM breads b
      JOIN checkins c ON c.id = b.checkin_id
      WHERE c.bakery_id = v_bakery_id
    )
  WHERE id = v_bakery_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_bread_insert
  AFTER INSERT ON breads
  FOR EACH ROW
  EXECUTE FUNCTION update_bakery_rating_on_bread();

-- 주변 빵집 검색
CREATE OR REPLACE FUNCTION nearby_bakeries(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_m INTEGER DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  avg_rating NUMERIC,
  checkin_count INTEGER,
  distance_m DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.address, b.lat, b.lng,
    b.avg_rating, b.checkin_count,
    ST_Distance(
      ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) AS distance_m
  FROM bakeries b
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(b.lng, b.lat), 4326)::geography,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_m
  )
  ORDER BY distance_m;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STORAGE BUCKET
-- ============================================

-- Supabase Dashboard에서 'photos' 버킷을 public으로 생성하세요.
-- SQL로는: INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);
