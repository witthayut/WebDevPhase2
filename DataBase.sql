DROP DATABASE IF EXISTS webdev;
CREATE DATABASE webdev;
USE webdev;

CREATE TABLE onlinecourse (
    idCourse VARCHAR(6) PRIMARY KEY,
    nameCourse VARCHAR(50) NOT NULL,
    instructorName VARCHAR(50) NOT NULL,
    price INT NOT NULL,
    releaseDate DATE NOT NULL,
    rating FLOAT NULL,
    description VARCHAR(200) NOT NULL,
    chapterCovered VARCHAR(500) NOT NULL,
    imageOfSubject VARCHAR(255) UNIQUE,
    subjectCategory VARCHAR(20) NOT NULL,
    perfectFor VARCHAR(500) NOT NULL
);

CREATE TABLE adminidinfo (
    adminID INT PRIMARY KEY,
    adminDOB DATE NOT NULL,
    fname VARCHAR(50) NOT NULL,
    lname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    admidAddress VARCHAR(200) NOT NULL,
    password VARCHAR(20) NOT NULL UNIQUE,
    role VARCHAR(10) NOT NULL UNIQUE
);

CREATE TABLE userinfo (
    username VARCHAR(20) PRIMARY KEY,
    stuDOB DATE NOT NULL,
    fname VARCHAR(50) NOT NULL,
    lname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    stuAddress VARCHAR(200) NOT NULL,
    password VARCHAR(20) NOT NULL
);

CREATE TABLE adminlog (
    IDlist VARCHAR(6) PRIMARY KEY,
    role VARCHAR(10) NOT NULL,
    adminID INT NOT NULL,
    curTime DATETIME NOT NULL,
    password VARCHAR(20) NOT NULL,
    CONSTRAINT fk_adminlog_role FOREIGN KEY (role) REFERENCES adminidinfo(role),
    CONSTRAINT fk_adminlog_adminid FOREIGN KEY (adminID) REFERENCES adminidinfo(adminID),
    CONSTRAINT fk_adminlog_password FOREIGN KEY (password) REFERENCES adminidinfo(password)
);

CREATE TABLE `modify` (
    modifyID INT AUTO_INCREMENT PRIMARY KEY,
    Operation VARCHAR(15) NOT NULL,
    ModiDate DATE NOT NULL
);

INSERT INTO onlinecourse (
    idCourse, nameCourse, instructorName, price, releaseDate, rating,
    description, chapterCovered, imageOfSubject, subjectCategory, perfectFor
) VALUES
('C00001', 'HTML Basics', 'Sarah Johnson', 990, '2025-01-15', 4.5,
 'Learn the fundamentals of HTML and page structure for web development.',
 'HTML tags, document structure, links, images, tables, forms',
 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOcdG1on-ElwPn2Woy_GVZKQnBkcQveyX2Sg&s', 'WebDev',
 'Beginners who want to start building websites'),
('C00002', 'CSS Essentials', 'Michael Lee', 1190, '2025-02-01', 4.6,
 'Understand styling, layout, and responsive web design using CSS.',
 'Selectors, colors, box model, flexbox, grid, responsive design',
 'https://wproom.com/wp-content/uploads/2024/01/css.png', 'WebDev',
 'Students who want to improve website design'),
('C00003', 'JavaScript Starter', 'Emily Carter', 1490, '2025-02-20', 4.8,
 'Learn JavaScript syntax and build interactive web pages.',
 'Variables, conditions, loops, functions, DOM manipulation, events',
 'https://cdn.sanity.io/images/3do82whm/next/a69e3ba2441d35dd1a7945e826064708f30c10a9-1000x667.jpg', 'Coding',
 'New coders who want to add interactivity to websites'),
('C00004', 'NodeJS Fundamentals', 'David Wilson', 1790, '2025-03-10', 4.4,
 'Build backend applications and APIs using Node.js and Express.',
 'Node.js basics, modules, npm, Express, routing',
 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhVwzidcHVJdBsdJwtC-kaCPCsBK0Mb6rCYA&s', 'Backend',
 'Students moving into backend development'),
('C00005', 'MySQL for Beginners', 'Olivia Brown', 1590, '2025-03-25', 4.3,
 'Learn relational databases and SQL with practical MySQL examples.',
 'Database design, SELECT, INSERT, UPDATE, DELETE, JOIN',
 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS4pcg6eDMHQ3KZyq4EpGo7TOA7pyXJ5aLPFw&s', 'Database',
 'Learners building projects with structured data'),
('C00006', 'PHP Database Project', 'James Anderson', 1690, '2025-04-05', 4.2,
 'Create dynamic websites with PHP and MySQL integration.',
 'PHP syntax, forms, sessions, CRUD, database connection',
 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjhQ9s532rngunSSNEyZ5w9qzx9Pf090ISCQ&s', 'Backend',
 'Students who want full stack project experience'),
('C00007', 'React Introduction', 'Sophia Martinez', 1990, '2025-04-18', 4.9,
 'Build modern user interfaces using React components and hooks.',
 'JSX, props, state, events, hooks, component structure',
 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1g-8Xl6v3imqC_qfp37nHVCC7Owoeynr0Kw&s', 'Frontend',
 'Frontend learners ready for modern frameworks'),
('C00008', 'UI UX Basics', 'Daniel Kim', 1090, '2025-05-02', 4.1,
 'Understand interface and user experience design principles.',
 'Wireframes, color theory, typography, usability, layout',
 'https://bemyfriend.agency/wp-content/uploads/2021/02/UXUI2.jpg', 'Design',
 'Anyone interested in designing better digital products'),
('C00009', 'Python Programming', 'Isabella Moore', 1390, '2025-05-15', 4.7,
 'Start programming with Python through simple and practical examples.',
 'Syntax, variables, loops, functions, lists, dictionaries',
 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQpTR67kC-J8Ts-Fx2_5XrfcOHt-4s7MQIUIA&s', 'Coding',
 'Absolute beginners in programming'),
('C00010', 'Excel Data Analysis', 'William Taylor', 890, '2025-05-28', 4.0,
 'Analyze and visualize data efficiently using Excel tools.',
 'Formulas, sorting, filtering, charts, pivot tables',
 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRjVXep1eNsLyKPBgxGIqAl8c_d02aULb1INA&s', 'Analysis',
 'Office workers and students handling data');

INSERT INTO adminidinfo (
    adminID, adminDOB, fname, lname, email, admidAddress, password, role
) VALUES
(100001, '1990-02-14', 'Alice', 'Wong', 'alice.wong@webdev.com', '12 Park Avenue, New York', 'alice123', 'Admin001'),
(100002, '1988-07-21', 'Brian', 'Tan', 'brian.tan@webdev.com', '45 Lake Street, Chicago', 'brian123', 'Admin002'),
(100003, '1992-11-03', 'Chanya', 'Smith', 'chanya.smith@webdev.com', '89 River Road, Boston', 'chanya123', 'Admin003'),
(100004, '1991-01-30', 'David', 'Lim', 'david.lim@webdev.com', '23 Hill Street, Seattle', 'david123', 'Admin004'),
(100005, '1989-05-19', 'Emma', 'Clark', 'emma.clark@webdev.com', '67 Sunset Drive, Denver', 'emma123', 'Admin005'),
(100006, '1993-09-12', 'Farah', 'Noor', 'farah.noor@webdev.com', '31 Green Lane, Austin', 'farah123', 'Admin006'),
(100007, '1994-06-07', 'George', 'Miller', 'george.miller@webdev.com', '54 Ocean Avenue, Miami', 'george123', 'Admin007'),
(100008, '1990-12-25', 'Hana', 'Kim', 'hana.kim@webdev.com', '76 Cedar Street, Dallas', 'hana123', 'Admin008'),
(100009, '1987-08-09', 'Ivan', 'Petrov', 'ivan.petrov@webdev.com', '18 Pine Road, Phoenix', 'ivan123', 'Admin009'),
(100010, '1995-04-16', 'Julia', 'Smith', 'julia.smith@webdev.com', '92 Maple Street, Atlanta', 'julia123', 'Admin010');

INSERT INTO userinfo (
    username, stuDOB, fname, lname, email, stuAddress, password
) VALUES
('john2026', '2003-01-12', 'John', 'Miller', 'john.miller@email.com', '15 King Street, New York', 'john123'),
('anna_p', '2002-03-25', 'Anna', 'Park', 'anna.park@email.com', '22 Rose Avenue, Chicago', 'anna123'),
('mike_dev', '2001-06-18', 'Michael', 'Chen', 'michael.chen@email.com', '48 Main Road, Boston', 'mike123'),
('sara_l', '2004-09-02', 'Sara', 'Lopez', 'sara.lopez@email.com', '77 Elm Street, Seattle', 'sara123'),
('tommy99', '2000-12-10', 'Tommy', 'Nguyen', 'tommy.nguyen@email.com', '35 Oak Drive, Denver', 'tommy123'),
('nina_art', '2003-07-07', 'Nina', 'Brown', 'nina.brown@email.com', '90 Cedar Lane, Austin', 'nina123'),
('alex_it', '2002-11-14', 'Alex', 'Johnson', 'alex.johnson@email.com', '13 River Street, Miami', 'alex123'),
('mint_web', '2004-04-29', 'Mina', 'Davis', 'mina.davis@email.com', '61 Garden Road, Dallas', 'mina123'),
('peter_g', '2001-08-21', 'Peter', 'Garcia', 'peter.garcia@email.com', '27 Hill Avenue, Phoenix', 'peter123'),
('lisa_code', '2003-05-05', 'Lisa', 'Taylor', 'lisa.taylor@email.com', '84 Maple Road, Atlanta', 'lisa123');

INSERT INTO adminlog (
    IDlist, role, adminID, curTime, password
) VALUES
('L00001', 'Admin001', 100001, '2026-04-01 08:15:00', 'alice123'),
('L00002', 'Admin002', 100002, '2026-04-01 09:00:00', 'brian123'),
('L00003', 'Admin003', 100003, '2026-04-02 10:20:00', 'chanya123'),
('L00004', 'Admin004', 100004, '2026-04-02 11:05:00', 'david123'),
('L00005', 'Admin005', 100005, '2026-04-03 13:40:00', 'emma123'),
('L00006', 'Admin006', 100006, '2026-04-03 14:10:00', 'farah123'),
('L00007', 'Admin007', 100007, '2026-04-04 15:25:00', 'george123'),
('L00008', 'Admin008', 100008, '2026-04-04 16:30:00', 'hana123'),
('L00009', 'Admin009', 100009, '2026-04-05 09:45:00', 'ivan123'),
('L00010', 'Admin010', 100010, '2026-04-05 10:50:00', 'julia123');

INSERT INTO `modify` (
    Operation, ModiDate
) VALUES
('Add', '2026-04-01'),
('Edit', '2026-04-02'),
('Delete', '2026-04-03'),
('Add', '2026-04-04'),
('Edit', '2026-04-05'),
('Delete', '2026-04-06'),
('Add', '2026-04-07'),
('Edit', '2026-04-08'),
('Delete', '2026-04-09'),
('Add', '2026-04-10');
