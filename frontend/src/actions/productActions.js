import axios from 'axios';
import {
    PRODUCTS_REQUEST, PRODUCTS_SUCCESS, PRODUCTS_FAIL,
    PRODUCT_DETAILS_REQUEST, PRODUCT_DETAILS_SUCCESS, PRODUCT_DETAILS_FAIL,
    REVIEWS_REQUEST, REVIEWS_SUCCESS, REVIEWS_FAIL,
    ADMIN_PRODUCTS_REQUEST, ADMIN_PRODUCTS_SUCCESS, ADMIN_PRODUCTS_FAIL,
    BULK_DELETE_PRODUCTS_REQUEST, BULK_DELETE_PRODUCTS_SUCCESS, BULK_DELETE_PRODUCTS_FAIL,
    CLEAR_ERRORS
} from '../constants/productConstants';
import { API, authConfig, getErrorMessage } from '../Components/Utils/helpers';

// Public product list. params: { keyword, category, minPrice, maxPrice, minRating, minReviews, sort, page, limit }
// append = true adds the next page to the list (used by infinite scroll)
export const getProducts = (params = {}, append = false) => async (dispatch) => {
    try {
        dispatch({ type: PRODUCTS_REQUEST });
        const { data } = await axios.get(`${API}/products`, { params });
        dispatch({
            type: PRODUCTS_SUCCESS,
            payload: { products: data.products, count: data.count, page: data.page, pages: data.pages, append }
        });
    } catch (error) {
        dispatch({ type: PRODUCTS_FAIL, payload: getErrorMessage(error) });
    }
};

// one product (includes its reviews)
export const getProductDetails = (id) => async (dispatch) => {
    try {
        dispatch({ type: PRODUCT_DETAILS_REQUEST });
        const { data } = await axios.get(`${API}/products/${id}`);
        dispatch({ type: PRODUCT_DETAILS_SUCCESS, payload: data.product });
    } catch (error) {
        dispatch({ type: PRODUCT_DETAILS_FAIL, payload: getErrorMessage(error) });
    }
};

// reviews of one product (public)
export const getProductReviews = (id) => async (dispatch) => {
    try {
        dispatch({ type: REVIEWS_REQUEST });
        const { data } = await axios.get(`${API}/products/${id}/reviews`);
        dispatch({ type: REVIEWS_SUCCESS, payload: data });   // { reviews, ratings, numOfReviews }
    } catch (error) {
        dispatch({ type: REVIEWS_FAIL, payload: getErrorMessage(error) });
    }
};

// admin product list (all products, active and inactive)
export const getAdminProducts = () => async (dispatch) => {
    try {
        dispatch({ type: ADMIN_PRODUCTS_REQUEST });
        const { data } = await axios.get(`${API}/admin/products`, authConfig());
        dispatch({ type: ADMIN_PRODUCTS_SUCCESS, payload: data.products });
    } catch (error) {
        dispatch({ type: ADMIN_PRODUCTS_FAIL, payload: getErrorMessage(error) });
    }
};

// delete many products at once (ids = array of product ids)
export const bulkDeleteProducts = (ids) => async (dispatch) => {
    try {
        dispatch({ type: BULK_DELETE_PRODUCTS_REQUEST });
        const { data } = await axios.post(`${API}/admin/products/bulk-delete`, { ids }, authConfig());
        dispatch({ type: BULK_DELETE_PRODUCTS_SUCCESS, payload: ids });
        return data;
    } catch (error) {
        dispatch({ type: BULK_DELETE_PRODUCTS_FAIL, payload: getErrorMessage(error) });
        throw error;
    }
};

// customer writes or updates their own review: { rating: 1-5, comment }
// returns the axios response data; the caller refreshes the reviews with getProductReviews
export const saveProductReview = (productId, { rating, comment }) =>
    axios.post(`${API}/products/${productId}/reviews`, { rating, comment }, authConfig()).then(res => res.data);

// admin removes a review
export const deleteProductReview = (productId, reviewId) => async (dispatch) => {
    await axios.delete(`${API}/admin/product/${productId}/reviews/${reviewId}`, authConfig());
    dispatch(getProductReviews(productId));
};

export const clearErrors = () => ({ type: CLEAR_ERRORS });
