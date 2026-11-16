package com.sanitaryware.crm.mapper;

import com.sanitaryware.crm.dto.OrderDTO;
import com.sanitaryware.crm.dto.QuotationDTO;
import com.sanitaryware.crm.entity.Order;
import com.sanitaryware.crm.entity.Product;
import com.sanitaryware.crm.entity.Quotation;
import com.sanitaryware.crm.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ProductAvailabilityMapperTest {

    @Test
    void orderItemRejectsUnavailableProduct() {
        ProductRepository products = mock(ProductRepository.class);
        Product product = unavailableProduct();
        when(products.findById(7L)).thenReturn(Optional.of(product));
        OrderMapper mapper = new OrderMapper();
        ReflectionTestUtils.setField(mapper, "productRepository", products);
        OrderDTO.OrderItemDTO item = new OrderDTO.OrderItemDTO();
        item.setProductId(7L);

        assertThrows(IllegalArgumentException.class, () -> mapper.toItemEntity(item, new Order()));
    }

    @Test
    void quotationItemRejectsUnavailableProduct() {
        ProductRepository products = mock(ProductRepository.class);
        Product product = unavailableProduct();
        when(products.findById(7L)).thenReturn(Optional.of(product));
        QuotationMapper mapper = new QuotationMapper();
        ReflectionTestUtils.setField(mapper, "productRepository", products);
        QuotationDTO.QuotationItemDTO item = new QuotationDTO.QuotationItemDTO();
        item.setProductId(7L);

        assertThrows(IllegalArgumentException.class, () -> mapper.toItemEntity(item, new Quotation()));
    }

    private Product unavailableProduct() {
        Product product = new Product();
        product.setId(7L);
        product.setName("Unavailable sample");
        product.setIsAvailable(false);
        return product;
    }
}
