"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const class_validator_1 = require("class-validator");
const bid_dto_1 = require("../src/modules/bidding/dto/bid.dto");
describe('BidDto Validation (Section 11.1 - Test Case 3)', () => {
    it('should accept integer 2', async () => {
        const dto = new bid_dto_1.BidDto();
        dto.amount = 2;
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.length).toBe(0);
    });
    it('should accept integer 1', async () => {
        const dto = new bid_dto_1.BidDto();
        dto.amount = 1;
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.length).toBe(0);
    });
    it('should reject float 2.50 with 400 Bad Request', async () => {
        const dto = new bid_dto_1.BidDto();
        dto.amount = 2.5;
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].property).toBe('amount');
        expect(errors[0].constraints).toHaveProperty('isInt');
    });
    it('should reject negative values', async () => {
        const dto = new bid_dto_1.BidDto();
        dto.amount = -1;
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.length).toBeGreaterThan(0);
    });
    it('should reject zero', async () => {
        const dto = new bid_dto_1.BidDto();
        dto.amount = 0;
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.length).toBeGreaterThan(0);
    });
    it('should reject string values', async () => {
        const dto = new bid_dto_1.BidDto();
        dto.amount = 'not-a-number';
        const errors = await (0, class_validator_1.validate)(dto);
        expect(errors.length).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=bid-dto.spec.js.map