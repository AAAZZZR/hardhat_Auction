//SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.5.0 <0.9.0;

contract Auction{
    address payable public owner;
    uint public startBlock;
    uint public endBlock;
    string public ipfsHash;

    enum state{Started, Running, Eneded, Cnaceled}
    state public auctionState;

    //ceiling price
    uint public highestBindingBid;

    address payable public highestBidder;
    mapping(address => uint) public bids;
    uint bidIncrement;

    bool public ownerFinalized = false;

    constructor(){
        owner = payable(msg.sender);
        auctionState = state.Running;

        startBlock = block.number;
        endBlock = startBlock + 100;

        //ipfsHash = "";
        //wei
        bidIncrement = 1000000000000000000;
    }

        modifier notOwner(){
            require(msg.sender != owner,"you are owner!");
            _;
        }

        modifier onlyOwner(){
            require(msg.sender == owner,"you are not owner!");
            _;
        }

        modifier afterStart(){
            require(block.number >= startBlock,"block not start");
            _;
        }

        modifier beforeEnd(){
            require(block.number <= endBlock,"block excceed");
            _;
        }

        function min(uint a, uint b) pure internal returns(uint){
            if(a <= b){
                return a;
            }else{
                return b;
            }

        }

        function cacelAuction() public beforeEnd onlyOwner{
            auctionState = state.Cnaceled;
        }

        function placeBid() public payable notOwner afterStart beforeEnd returns(bool){
            require(auctionState == state.Running);

            uint currentBid = bids[msg.sender] + msg.value;

            require (currentBid > highestBindingBid);

            bids[msg.sender] = currentBid;

            if (currentBid <= bids[highestBidder]){
                highestBindingBid = min(currentBid+bidIncrement,bids[highestBidder]);
            }else{
                highestBindingBid = min(currentBid,bids[highestBidder] + bidIncrement);
                highestBidder = payable(msg.sender);
            }
            return true;
        }

        function finalizedAuction() public{
            require (auctionState == state.Cnaceled || block.number > endBlock);

            require(msg.sender == owner || bids[msg.sender] >0);

            address payable recipient;
            uint value;

            if (auctionState == state.Cnaceled){
                recipient = payable(msg.sender);
                value = bids[msg.sender];
            }else{
                if(msg.sender == owner && ownerFinalized == false){
                    recipient = owner;
                    value = highestBindingBid;
                    ownerFinalized = true;
                }else{
                    if (msg.sender == highestBidder){
                        recipient = highestBidder;
                        value = bids[highestBidder] - highestBindingBid;
                    }else{
                        recipient = payable(msg.sender);
                        value = bids[msg.sender];
                    }
                }
            }

            bids[recipient] = 0;
            recipient.transfer(value);
        }
}