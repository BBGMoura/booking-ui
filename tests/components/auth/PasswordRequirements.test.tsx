import { render, screen } from '@testing-library/react';
import PasswordRequirements from '@/components/auth/PasswordRequirements';

describe('PasswordRequirements', () => {
  describe('visibility', () => {
    it('renders nothing when password is empty', () => {
      render(<PasswordRequirements password="" />);

      expect(screen.queryByText('8-16 characters')).not.toBeInTheDocument();
    });

    it('renders checklist when password has value', () => {
      render(<PasswordRequirements password="a" />);

      expect(screen.getByText('8-16 characters')).toBeInTheDocument();
      expect(screen.getByText('One uppercase letter')).toBeInTheDocument();
      expect(screen.getByText('One lowercase letter')).toBeInTheDocument();
      expect(screen.getByText('One number')).toBeInTheDocument();
      expect(screen.getByText('One special character')).toBeInTheDocument();
    });
  });

  describe('requirement states', () => {
    it('marks length requirement as met when password is 8-16 characters', () => {
      render(<PasswordRequirements password="Password1!" />);

      const item = screen.getByText('8-16 characters').closest('li');
      expect(item).toHaveClass('text-primary');
    });

    it('marks length requirement as unmet when password is under 8 characters', () => {
      render(<PasswordRequirements password="Pass1!" />);

      const item = screen.getByText('8-16 characters').closest('li');
      expect(item).toHaveClass('text-destructive');
    });

    it('marks uppercase requirement as met', () => {
      render(<PasswordRequirements password="A" />);

      const item = screen.getByText('One uppercase letter').closest('li');
      expect(item).toHaveClass('text-primary');
    });

    it('marks uppercase requirement as unmet', () => {
      render(<PasswordRequirements password="a" />);

      const item = screen.getByText('One uppercase letter').closest('li');
      expect(item).toHaveClass('text-destructive');
    });

    it('marks number requirement as met', () => {
      render(<PasswordRequirements password="1" />);

      const item = screen.getByText('One number').closest('li');
      expect(item).toHaveClass('text-primary');
    });

    it('marks special character requirement as met', () => {
      render(<PasswordRequirements password="!" />);

      const item = screen.getByText('One special character').closest('li');
      expect(item).toHaveClass('text-primary');
    });

    it('marks all requirements as met for a valid password', () => {
      render(<PasswordRequirements password="Password1!" />);

      const items = screen.getAllByRole('listitem');
      items.forEach((item) => {
        expect(item).toHaveClass('text-primary');
      });
    });
  });
});
