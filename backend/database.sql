-- NeighborLink Database Schema
-- Run this file to set up the MySQL database

CREATE DATABASE IF NOT EXISTS neighborlink;
USE neighborlink;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('user', 'provider') NOT NULL DEFAULT 'user',
  phone VARCHAR(20),
  location VARCHAR(200),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  avatar VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Services / Categories Table
CREATE TABLE IF NOT EXISTS service_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Provider Services Table (providers can offer multiple services)
CREATE TABLE IF NOT EXISTS provider_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  price_per_hour DECIMAL(10, 2),
  is_available BOOLEAN DEFAULT TRUE,
  experience_years INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES service_categories(id)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  provider_id INT NOT NULL,
  service_id INT NOT NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'completed', 'cancelled') DEFAULT 'pending',
  address TEXT NOT NULL,
  notes TEXT,
  total_amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (provider_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES provider_services(id)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL UNIQUE,
  user_id INT NOT NULL,
  provider_id INT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  punctuality_score INT CHECK (punctuality_score >= 1 AND punctuality_score <= 5),
  quality_score INT CHECK (quality_score >= 1 AND quality_score <= 5),
  communication_score INT CHECK (communication_score >= 1 AND communication_score <= 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (provider_id) REFERENCES users(id)
);

-- Trust Scores View (calculated)
CREATE OR REPLACE VIEW provider_trust_scores AS
SELECT 
  u.id AS provider_id,
  u.name,
  u.location,
  u.latitude,
  u.longitude,
  COUNT(DISTINCT b.id) AS completed_jobs,
  COALESCE(AVG(r.rating), 0) AS avg_rating,
  COALESCE(AVG(r.punctuality_score), 0) AS avg_punctuality,
  COALESCE(AVG(r.quality_score), 0) AS avg_quality,
  COALESCE(AVG(r.communication_score), 0) AS avg_communication,
  COUNT(DISTINCT r.id) AS total_reviews,
  -- Trust Score Formula: weighted composite of all metrics (out of 10)
  ROUND(
    (
      (COALESCE(AVG(r.rating), 3) / 5 * 4.0) +
      (COALESCE(AVG(r.punctuality_score), 3) / 5 * 2.0) +
      (COALESCE(AVG(r.quality_score), 3) / 5 * 2.0) +
      (COALESCE(AVG(r.communication_score), 3) / 5 * 1.0) +
      (LEAST(COUNT(DISTINCT b.id), 50) / 50 * 1.0)
    ), 1
  ) AS trust_score
FROM users u
LEFT JOIN bookings b ON b.provider_id = u.id AND b.status = 'completed'
LEFT JOIN reviews r ON r.provider_id = u.id
WHERE u.role = 'provider' AND u.is_active = TRUE
GROUP BY u.id, u.name, u.location, u.latitude, u.longitude;

-- Insert Sample Service Categories
INSERT INTO service_categories (name, icon, description) VALUES
('Electrician', '⚡', 'Electrical repairs, wiring, installation'),
('Plumber', '🔧', 'Pipe repairs, leaks, installations'),
('Carpenter', '🪛', 'Furniture, woodwork, fixtures'),
('Cleaner', '🧹', 'Home and office cleaning'),
('AC Repair', '❄️', 'Air conditioning service and repair'),
('Painter', '🎨', 'Interior and exterior painting'),
('Mechanic', '🔩', 'Vehicle and equipment repair'),
('Gardener', '🌿', 'Lawn care and gardening'),
('Security', '🔒', 'CCTV and security systems'),
('IT Support', '💻', 'Computer and tech support');

-- Insert Sample Provider Users (password: "password123" bcrypt hashed)
INSERT INTO users (name, email, password, role, phone, location, latitude, longitude) VALUES
('Ramesh Kumar', 'ramesh@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543210', 'Kātpādi, Tamil Nadu', 12.9716, 79.1348),
('Priya Sharma', 'priya@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543211', 'Vellore, Tamil Nadu', 12.9165, 79.1325),
('Arjun Singh', 'arjun@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543212', 'Kātpādi, Tamil Nadu', 12.9800, 79.1400),
('Meena Raj', 'meena@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'provider', '9876543213', 'Vellore, Tamil Nadu', 12.9100, 79.1200),
('Demo User', 'user@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'user', '9876543214', 'Kātpādi, Tamil Nadu', 12.9716, 79.1348);

-- Insert Sample Provider Services
INSERT INTO provider_services (provider_id, category_id, title, description, price_per_hour, experience_years) VALUES
(1, 1, 'Electrical Repairs & Wiring', 'Expert in home wiring, switchboard repairs, and electrical installations', 350.00, 8),
(2, 2, 'Plumbing & Pipe Work', 'Leak repairs, pipe fitting, bathroom fittings and drainage work', 300.00, 6),
(3, 3, 'Carpentry & Woodwork', 'Furniture repair, door/window work, custom woodwork', 400.00, 10),
(4, 4, 'Deep Home Cleaning', 'Full home cleaning, kitchen scrubbing, bathroom sanitization', 250.00, 4);

-- Insert Sample Bookings
INSERT INTO bookings (user_id, provider_id, service_id, booking_date, booking_time, status, address, total_amount) VALUES
(5, 1, 1, '2025-12-01', '10:00:00', 'completed', '12 MG Road, Vellore', 700.00),
(5, 2, 2, '2025-12-05', '09:00:00', 'completed', '12 MG Road, Vellore', 600.00),
(5, 3, 3, '2025-12-10', '14:00:00', 'accepted', '12 MG Road, Vellore', 800.00);

-- Insert Sample Reviews
INSERT INTO reviews (booking_id, user_id, provider_id, rating, review_text, punctuality_score, quality_score, communication_score) VALUES
(1, 5, 1, 5, 'Excellent work! Fixed all electrical issues quickly and professionally.', 5, 5, 4),
(2, 5, 2, 4, 'Good plumbing work. Neat and tidy. Came on time.', 4, 4, 5);
