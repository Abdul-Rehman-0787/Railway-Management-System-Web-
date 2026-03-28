import React from 'react';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h3>Railway Management System</h3>
                    <p>Safe, Comfortable, and Reliable Travel</p>
                </div>
                <div className="footer-section">
                    <h4>Quick Links</h4>
                    <ul>
                        <li><a href="/schedules">Train Schedules</a></li>
                        <li><a href="/catalogue">Train Catalogue</a></li>
                        <li><a href="/contact">Contact Us</a></li>
                    </ul>
                </div>
                <div className="footer-section">
                    <h4>Contact Info</h4>
                    <p>📞 0300-1234567</p>
                    <p>📧 support@railway.com</p>
                    <p>📍 Lahore, Pakistan</p>
                </div>
                <div className="footer-section">
                    <h4>Follow Us</h4>
                    <div className="social-links">
                        <span>📘 Facebook</span>
                        <span>🐦 Twitter</span>
                        <span>📸 Instagram</span>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                <p>&copy; 2024 Railway Management System. All rights reserved.</p>
                <p>Team: Taha Ijaz, Abdul Rehman, Mian Bilal Razzaq</p>
            </div>
        </footer>
    );
}

export default Footer;