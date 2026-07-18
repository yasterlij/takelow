import { validate } from 'class-validator';
import { BidDto } from '../src/modules/bidding/dto/bid.dto';

describe('BidDto Validation (Section 11.1 - Test Case 3)', () => {
  it('should accept integer 2', async () => {
    const dto = new BidDto();
    dto.amount = 2;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should accept integer 1', async () => {
    const dto = new BidDto();
    dto.amount = 1;
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should reject float 2.50 with 400 Bad Request', async () => {
    const dto = new BidDto();
    (dto as any).amount = 2.5;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('amount');
    expect(errors[0].constraints).toHaveProperty('isInt');
  });

  it('should reject negative values', async () => {
    const dto = new BidDto();
    (dto as any).amount = -1;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject zero', async () => {
    const dto = new BidDto();
    (dto as any).amount = 0;
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should reject string values', async () => {
    const dto = new BidDto();
    (dto as any).amount = 'not-a-number';
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
