package com.sanitaryware.crm.security;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class RequestPathLoggingFilter implements Filter {

    private static final Logger log = LoggerFactory.getLogger(RequestPathLoggingFilter.class);

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest req) {
            log.debug("Request: {} {}", req.getMethod(), req.getRequestURI());
        }
        chain.doFilter(request, response);
    }
}
