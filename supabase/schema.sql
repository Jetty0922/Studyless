-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, service_role;

-- Create profiles table
create table profiles (
  id uuid references auth.users not null primary key,
  theme text,
  has_completed_onboarding boolean default false,
  daily_goal int default 20,
  current_streak int default 0,
  longest_streak int default 0,
  last_study_date timestamp with time zone,
  push_token text,
  
  -- FSRS Personalization (NEW)
  fsrs_parameters jsonb,                              -- User's optimized FSRS weights
  last_optimization timestamp with time zone,        -- When params were last optimized
  
  -- Global Preferences (NEW)
  enable_load_balancing boolean default true,        -- Enable workload smoothing
  default_retention real default 0.90,               -- Target retention (0.85-0.95)
  leech_threshold integer default 4,                 -- Lapses before leech
  new_interval_percent real default 0.0,             -- Interval preserved after lapse
  learn_ahead_minutes integer default 20,            -- Learn ahead buffer
  global_easy_days jsonb,                            -- Global easy day settings
  
  updated_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Create decks table
create table decks (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  color text not null,
  emoji text,
  test_date timestamp with time zone,
  status text default 'upcoming',
  mode text default 'TEST_PREP',
  final_review_mode boolean default false,
  emergency_mode boolean default false,
  post_test_dialog_shown boolean default false,
  
  -- Exam Scheduler (NEW)
  exam_phase text,                                   -- MAINTENANCE, CONSOLIDATION, CRAM, etc.
  desired_retention real default 0.90,               -- Target retention for this deck
  
  -- Load Balancing (NEW)
  max_cards_per_day integer,                         -- Max total cards per day
  new_cards_per_day integer default 20,              -- New cards per day limit
  easy_days jsonb,                                   -- Days with reduced load
  insertion_order text default 'SEQUENTIAL',         -- SEQUENTIAL or RANDOM
  
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table decks enable row level security;

create policy "Users can view own decks" on decks
  for select using (auth.uid() = user_id);

create policy "Users can insert own decks" on decks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own decks" on decks
  for update using (auth.uid() = user_id);

create policy "Users can delete own decks" on decks
  for delete using (auth.uid() = user_id);

-- Create flashcards table
create table flashcards (
  id uuid not null primary key default gen_random_uuid(),
  deck_id uuid references decks(id) on delete cascade not null,
  user_id uuid references auth.users not null, -- Denormalized for easier RLS
  front text not null,
  back text not null,
  image_uri text,
  file_uri text,
  
  -- Mode switch
  mode text default 'TEST_PREP',
  test_date timestamp with time zone,
  
  -- Learning Phase (NEW/UPDATED)
  learning_state text default 'LEARNING',            -- LEARNING, RELEARNING, GRADUATED
  learning_step integer default 0,                   -- Current step index
  learning_steps integer[],                          -- Step intervals in seconds
  learning_card_type text,                           -- INTRADAY or INTERDAY
  
  -- TEST_PREP fields
  schedule integer[],
  current_step integer default 0,
  mastery text default 'LEARNING',
  
  -- LONG_TERM (FSRS) fields
  state integer default 0,
  stability real default 0,
  difficulty real default 5,                         -- Default 5 (middle of 1-10)
  reps integer default 0,
  lapses integer default 0,
  last_review timestamp with time zone,
  
  -- Ease Factor (NEW)
  ease_factor real default 2.5,                      -- Starting at 250%
  
  -- Review Time Tracking (NEW)
  review_time_ms integer,                            -- Time to answer in ms
  
  -- Load Balancing (NEW)
  original_due_date timestamp with time zone,        -- Original date before balancing
  
  -- Leech Detection (NEW)
  is_leech boolean default false,
  leech_suspended boolean default false,
  leech_action text,                                 -- SIMPLIFIED, SPLIT, MNEMONIC_ADDED, SUSPENDED
  
  -- Common fields
  response_history jsonb,
  priority text default 'NORMAL',
  again_count int default 0,
  next_review_date timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table flashcards enable row level security;

create policy "Users can view own flashcards" on flashcards
  for select using (auth.uid() = user_id);

create policy "Users can insert own flashcards" on flashcards
  for insert with check (auth.uid() = user_id);

create policy "Users can update own flashcards" on flashcards
  for update using (auth.uid() = user_id);

create policy "Users can delete own flashcards" on flashcards
  for delete using (auth.uid() = user_id);

-- Create indexes for better query performance
create index if not exists idx_flashcards_deck_id on flashcards(deck_id);
create index if not exists idx_flashcards_user_id on flashcards(user_id);
create index if not exists idx_flashcards_next_review on flashcards(next_review_date);
create index if not exists idx_flashcards_learning_state on flashcards(learning_state);

-- ============================================================================
-- REVIEW HISTORY TABLE (NEW)
-- ============================================================================
-- Stores complete review history for FSRS optimization and analytics

create table review_history (
  id uuid not null primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  card_id uuid references flashcards(id) on delete cascade,
  
  -- Rating and timing
  rating integer not null check (rating >= 1 and rating <= 4),
  review_date timestamp with time zone not null default now(),
  review_time_ms integer,                            -- Answer time in milliseconds
  
  -- Scheduling data
  elapsed_days real,                                 -- Days since last review
  scheduled_days real,                               -- Original scheduled interval
  
  -- Card state at review time (for optimization)
  state integer,                                     -- FSRS state
  stability real,                                    -- Stability before review
  difficulty real,                                   -- Difficulty before review
  ease_factor real,                                  -- Ease factor before review
  
  created_at timestamp with time zone default now()
);

alter table review_history enable row level security;

create policy "Users can view own review history" on review_history
  for select using (auth.uid() = user_id);

create policy "Users can insert own review history" on review_history
  for insert with check (auth.uid() = user_id);

-- Create indexes for review_history
create index if not exists idx_review_history_user on review_history(user_id);
create index if not exists idx_review_history_card on review_history(card_id);
create index if not exists idx_review_history_date on review_history(review_date);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, has_completed_onboarding)
  values (new.id, false);
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create storage buckets (if not exists, this is usually done via UI or Storage API, but good to document)
-- insert into storage.buckets (id, name) values ('flashcard-images', 'flashcard-images');
-- insert into storage.buckets (id, name) values ('flashcard-files', 'flashcard-files');

-- Set up storage policies
-- create policy "Any authenticated user can view flashcard images"
--   on storage.objects for select
--   using ( bucket_id = 'flashcard-images' and auth.role() = 'authenticated' );

-- create policy "Users can upload flashcard images"
--   on storage.objects for insert
--   with check ( bucket_id = 'flashcard-images' and auth.role() = 'authenticated' );

