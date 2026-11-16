package com.sanitaryware.crm.exception;

import com.sanitaryware.crm.dto.ApiErrorResponse;
import com.sanitaryware.crm.security.TooManyRequestsException;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({org.springframework.dao.ConcurrencyFailureException.class,
            org.springframework.dao.QueryTimeoutException.class,
            jakarta.persistence.LockTimeoutException.class,
            jakarta.persistence.PessimisticLockException.class})
    public ResponseEntity<ApiErrorResponse> handleConcurrentMutation(Exception ex) {
        return error(HttpStatus.CONFLICT,
                "Another request changed or locked this record. Refresh and retry; reuse the same payment request key for an unchanged payment.");
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return error(HttpStatus.PAYLOAD_TOO_LARGE, "Uploaded files must be 160 MB or smaller.");
    }

    @ExceptionHandler(MultipartException.class)
    public ResponseEntity<ApiErrorResponse> handleMultipartException(MultipartException ex) {
        if (isUploadSizeExceeded(ex)) {
            return error(HttpStatus.PAYLOAD_TOO_LARGE, "Uploaded files must be 160 MB or smaller.");
        }
        if (hasCause(ex, org.springframework.web.multipart.support.MissingServletRequestPartException.class)) {
            return error(HttpStatus.BAD_REQUEST, "Upload request is missing the required PDF file part.");
        }
        return error(HttpStatus.BAD_REQUEST,
                "Could not read the multipart upload. Select a PDF and include the required brand and file fields.");
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingMultipartPart(MissingServletRequestPartException ex) {
        return error(HttpStatus.BAD_REQUEST, "Upload request is missing the required PDF file part.");
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadableMessage(HttpMessageNotReadableException ex) {
        return error(HttpStatus.BAD_REQUEST, "Invalid request");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach(bindingError -> {
            String field = bindingError instanceof FieldError fieldError ? fieldError.getField() : "request";
            errors.put(field, bindingError.getDefaultMessage());
        });
        return error(HttpStatus.BAD_REQUEST, "Validation failed", errors);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex) {
        if ("file".equals(ex.getParameterName())) {
            return error(HttpStatus.BAD_REQUEST, "Select a PDF file to upload.");
        }
        if ("brandId".equals(ex.getParameterName())) {
            return error(HttpStatus.BAD_REQUEST, "Select the product brand for this catalogue.");
        }
        if ("previewSha256".equals(ex.getParameterName())) {
            return error(HttpStatus.PRECONDITION_REQUIRED,
                    "Preview the catalogue and confirm its review before importing.");
        }
        return error(HttpStatus.BAD_REQUEST, "Invalid request");
    }

    @ExceptionHandler(TypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> handleTypeMismatch(TypeMismatchException ex) {
        return error(HttpStatus.BAD_REQUEST, "Invalid request");
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "Resource not found");
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, "You do not have access to this resource.");
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "Resource not found");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        return error(HttpStatus.CONFLICT, "Request conflicts with existing data");
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleResponseStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String message = ex.getReason() == null ? status.getReasonPhrase() : ex.getReason();
        return error(status, message);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        return error(HttpStatus.UNAUTHORIZED, "Invalid username or password");
    }

    @ExceptionHandler(org.springframework.security.authentication.DisabledException.class)
    public ResponseEntity<ApiErrorResponse> handleDisabledAccount(org.springframework.security.authentication.DisabledException ex) {
        return error(HttpStatus.FORBIDDEN, "Account is deactivated");
    }

    @ExceptionHandler(org.springframework.security.authentication.LockedException.class)
    public ResponseEntity<ApiErrorResponse> handleLockedAccount(org.springframework.security.authentication.LockedException ex) {
        return error(HttpStatus.FORBIDDEN, "Account is locked");
    }

    @ExceptionHandler(org.springframework.security.authentication.AccountStatusException.class)
    public ResponseEntity<ApiErrorResponse> handleAccountStatus(org.springframework.security.authentication.AccountStatusException ex) {
        return error(HttpStatus.FORBIDDEN, "Account is not active");
    }

    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ApiErrorResponse> handleTooManyRequests(TooManyRequestsException ex) {
        return error(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> handleIllegalArgument(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, "Invalid request");
    }

    @ExceptionHandler(BusinessValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessValidation(BusinessValidationException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        return error(HttpStatus.METHOD_NOT_ALLOWED, "HTTP method not allowed");
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiErrorResponse> handleRuntimeException(RuntimeException ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
    }

    private ResponseEntity<ApiErrorResponse> error(HttpStatus status, String message) {
        return error(status, message, null);
    }

    private ResponseEntity<ApiErrorResponse> error(
            HttpStatus status,
            String message,
            Map<String, String> validationErrors
    ) {
        ApiErrorResponse response = new ApiErrorResponse(
                status.value(), status.getReasonPhrase(), message, validationErrors);
        return ResponseEntity.status(status).body(response);
    }

    private boolean isUploadSizeExceeded(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            String message = cause.getMessage();
            if (cause instanceof MaxUploadSizeExceededException
                    || (message != null && message.toLowerCase(java.util.Locale.ROOT)
                    .matches(".*(request|file|upload).*(too large|exceed|maximum permitted|size limit).*"))) {
                return true;
            }
        }
        return false;
    }

    private boolean hasCause(Throwable exception, Class<? extends Throwable> type) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (type.isInstance(cause)) {
                return true;
            }
        }
        return false;
    }
}
