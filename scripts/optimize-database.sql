-- Database optimization script for exam start route performance
-- This script adds indexes for frequently queried columns

-- Index for topic and level filtering (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_questions_topic_level ON questions(topic, level);

-- Index for context-based questions
CREATE INDEX IF NOT EXISTS idx_questions_context ON questions(context_id);

-- Index for language filtering  
CREATE INDEX IF NOT EXISTS idx_questions_language_ru ON questions(question_ru);
CREATE INDEX IF NOT EXISTS idx_questions_language_kz ON questions(question_kz);

-- Composite index for structured exam queries
CREATE INDEX IF NOT EXISTS idx_questions_topic_level_context ON questions(topic, level, context_id);

-- Index for answer options performance
CREATE INDEX IF NOT EXISTS idx_answer_options_question ON answer_options(question_id, order_index);

-- Index for suboptions performance
CREATE INDEX IF NOT EXISTS idx_suboptions_option ON suboptions(option_id, order_index);

-- Index for exam questions lookup
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam ON exam_questions(exam_id, question_order);

-- Show index creation results
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';