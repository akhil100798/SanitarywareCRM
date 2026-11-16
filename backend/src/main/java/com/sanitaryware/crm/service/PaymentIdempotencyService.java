package com.sanitaryware.crm.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sanitaryware.crm.entity.PaymentRequest;
import com.sanitaryware.crm.exception.ConflictException;
import com.sanitaryware.crm.repository.PaymentRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Optional;
import java.util.function.LongPredicate;

/** Called inside the receipt transaction, after locking its owning aggregate. */
@Service @RequiredArgsConstructor
public class PaymentIdempotencyService {
    private final PaymentRequestRepository repository;
    private final ObjectMapper mapper;

    public String fingerprint(Object... parts) {
        try {
            return hash(mapper.writeValueAsString(Arrays.asList(parts)));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot serialize payment intent", e);
        }
    }

    public <T> Optional<T> replay(Long actorId, String operation, String key, String fingerprint,
                                  Class<T> responseType, LongPredicate receiptExists) {
        if (key == null) return Optional.empty();
        validateKey(key);
        return repository.findByActorIdAndOperationAndKeyHash(actorId, operation, hash(key)).map(record -> {
            if (!record.getRequestHash().equals(fingerprint)) {
                throw new ConflictException("This payment request key was already used for different payment details. Refresh and review the payment before submitting a new request.");
            }
            if (!receiptExists.test(record.getPaymentId())) {
                throw new ConflictException("This payment was reversed. Its request key cannot be used to record another payment.");
            }
            try {
                return mapper.readValue(record.getResponseJson(), responseType);
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Cannot read stored payment response", e);
            }
        });
    }

    public void remember(Long actorId, String operation, String key, String fingerprint, Long receiptId, Object response) {
        if (key == null) return;
        validateKey(key);
        PaymentRequest record = new PaymentRequest();
        record.setActorId(actorId);
        record.setOperation(operation);
        record.setKeyHash(hash(key));
        record.setRequestHash(fingerprint);
        record.setPaymentId(receiptId);
        try {
            record.setResponseJson(mapper.writeValueAsString(response));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Cannot store payment response", e);
        }
        repository.saveAndFlush(record);
    }

    private void validateKey(String key) {
        if (!key.matches("[A-Za-z0-9._:-]{8,128}")) {
            throw new com.sanitaryware.crm.exception.BusinessValidationException("Idempotency-Key must contain 8 to 128 letters, digits, dots, underscores, colons or hyphens");
        }
    }

    private String hash(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
