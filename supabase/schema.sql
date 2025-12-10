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
  
  -- TEST_PREP fields
  schedule integer[],
  current_step integer default 0,
  mastery text default 'LEARNING',
  
  -- LONG_TERM (FSRS) fields
  state integer default 0,
  stability real default 0,
  difficulty real default 0,
  reps integer default 0,
  lapses integer default 0,
  last_review timestamp with time zone,
  
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

