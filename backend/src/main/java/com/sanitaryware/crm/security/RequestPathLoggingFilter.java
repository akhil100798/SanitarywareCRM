package com.sanitaryware.crm.security;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RequestPathLoggingFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest) {
            HttpServletRequest req = (HttpServletRequest) request;
            System.out.println("DEBUG PATH: Method=" + req.getMethod() + 
                               ", URI=" + req.getRequestURI() + 
                               ", Context=" + req.getContextPath() + 
                               ", Servlet=" + req.getServletPath());
        }
        chain.doFilter(request, response);
    }
}
